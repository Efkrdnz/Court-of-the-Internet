import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { resetClock } from "@/server/clock";
import Image from "@/app/cases/[slug]/opengraph-image";
import { makeCase, makeUser, resetDb } from "../support/helpers";

beforeEach(async () => {
  resetClock();
  await resetDb();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("share images are self-contained (audit 42 D1)", () => {
  const realFetch = globalThis.fetch;
  let requests: string[] = [];
  beforeEach(() => {
    requests = [];
    // No network: any request for an emoji or a font fails, as it would offline.
    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("data:")) return realFetch(url); // the renderer's own bundled wasm
      requests.push(url);
      throw new Error("offline");
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("renders emoji, other scripts and accents without fetching anything", async () => {
    const accused = await makeUser();
    await db.user.update({ where: { id: accused }, data: { displayName: "Snack Fan \u{1F355}" } });
    const cases = [
      await makeCase(accused, { title: "I ate the last slice \u{1F355}\u{1F355} and blamed the dog \u{1F436}" }),
      await makeCase(accused, { title: "Я съел последний кусок пиццы", confession: "Я съел последний кусок пиццы у соседа по комнате и свалил всё на кота." }),
      await makeCase(accused, { title: "我吃了室友的最后一块披萨然后怪罪给了猫咪" }),
      await makeCase(accused, { title: "Crème brûlée heist at the café, ā ē ī" }),
    ];
    for (const c of cases) {
      const res = await Image({ params: Promise.resolve({ slug: String(c.number) }) });
      expect(res.status).toBe(200);
      const png = Buffer.from(await res.arrayBuffer());
      expect(png.subarray(1, 4).toString()).toBe("PNG");
    }
    expect(requests).toEqual([]);
  });
});
