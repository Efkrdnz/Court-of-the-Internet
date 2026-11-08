import { expect, test } from "@playwright/test";

/** Wilson lower bound, mirrored from src/lib/progression.ts, to check the rendered order. */
function wilson(wins: number, total: number, z = 1.96) {
  if (!total) return 0;
  const p = wins / total;
  const z2 = z * z;
  return (p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / (1 + z2 / total);
}

for (const [board, role] of [
  ["Best defense attorneys", "Defense attorney"],
  ["Best prosecutors", "Prosecutor"],
] as const) {
  test(`${board}: thresholds, Wilson order and agreement with profiles`, async ({ page }) => {
    await page.goto("/leaderboards");
    const section = page.getByRole("region", { name: board });
    const rows = section.getByRole("listitem");
    await expect(rows.first()).toBeVisible(); // the page streams in behind a loading boundary
    const count = await rows.count();
    expect(count, `${board} should list ranked players from seeded games`).toBeGreaterThan(0);

    const parsed: { username: string; wins: number; losses: number }[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const href = await row.getByRole("link").getAttribute("href");
      const text = await row.innerText();
      const m = text.match(/(\d+)W–(\d+)L/);
      expect(m, `row ${i} shows a W–L record`).not.toBeNull();
      parsed.push({ username: href!.replace("/u/", ""), wins: Number(m![1]), losses: Number(m![2]) });
    }
    // Participation threshold: at least 3 decided cases.
    for (const r of parsed) expect(r.wins + r.losses).toBeGreaterThanOrEqual(3);
    // Ranked by confidence-adjusted win rate (non-increasing).
    for (let i = 1; i < parsed.length; i++) {
      expect(wilson(parsed[i - 1].wins, parsed[i - 1].wins + parsed[i - 1].losses)).toBeGreaterThanOrEqual(
        wilson(parsed[i].wins, parsed[i].wins + parsed[i].losses) - 1e-9,
      );
    }
    // The leader's record matches their public profile.
    const top = parsed[0];
    await page.goto(`/u/${top.username}`);
    const card = page.locator("div.velvet", { has: page.getByText(role, { exact: true }) });
    await expect(card.locator("dl div", { has: page.locator("dt", { hasText: "Wins / losses" }) })).toContainText(`${top.wins} / ${top.losses}`);
  });
}

test("jury board respects the 5-vote threshold and is sorted by votes", async ({ page }) => {
  await page.goto("/leaderboards");
  const rows = page.getByRole("region", { name: "Most active jurors" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  const votes: number[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const stat = await rows.nth(i).locator("span.shrink-0.text-right").innerText();
    votes.push(Number(stat));
  }
  expect(votes.length).toBeGreaterThan(0);
  for (const v of votes) expect(v).toBeGreaterThanOrEqual(5);
  expect([...votes].sort((a, b) => b - a)).toEqual(votes);
});

test("entertaining cases are ordered by reaction points and link to real cases", async ({ page }) => {
  await page.goto("/leaderboards");
  await expect(page.getByText(/#1 · \d+ reaction points/)).toBeVisible();
  const points = await page.getByText(/#\d+ · \d+ reaction points/).allInnerTexts();
  const scores = points.map((t) => Number(t.match(/· (\d+) reaction/i)![1]));
  expect(scores.length).toBeGreaterThan(0);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  const firstCase = page.getByRole("region", { name: "Most entertaining cases" }).getByRole("link").first();
  await firstCase.click();
  await expect(page).toHaveURL(/\/cases\/\d+-/);
});
