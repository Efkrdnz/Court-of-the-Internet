/**
 * Development seed. Every case is played through the real game services under a
 * simulated clock, so stats, XP, achievements and notifications are all genuine.
 *
 *   npm run db:seed            # seeds an empty database
 *   npm run db:seed -- --reset # wipes the dev database first (refuses on *_test / production)
 */
import { db } from "../src/server/db";
import { resetClock, setClock } from "../src/server/clock";
import { registerUser } from "../src/server/services/accounts";
import { castVote, claimCase, confess, submitArgument } from "../src/server/services/cases";
import { closeDeliberation } from "../src/server/services/verdict";
import { toggleReaction } from "../src/server/services/reactions";
import { fileReport } from "../src/server/services/moderation";
import { DEMO_PASSWORD } from "../src/lib/demo";
import {
  AWAITING_DEFENSE_CASES,
  AWAITING_PROSECUTION_CASES,
  CLOSED_CASES,
  DELIBERATION_CASES,
  SEED_USERS,
  type SeedCase,
} from "./seed-data";

const HOUR = 3_600_000;
const MIN = 60_000;

let seed = 1337;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
}
const between = (a: number, b: number) => a + rand() * (b - a);
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let t = Date.now();
setClock(() => new Date(t));

async function main() {
  const reset = process.argv.includes("--reset");
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PRODUCTION_SEED) {
    throw new Error("Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=1 if you really mean it.");
  }
  const existing = await db.user.count();
  if (existing > 0 && !reset) {
    console.log(`Database already has ${existing} users; skipping seed. Re-run with --reset to wipe and reseed.`);
    return;
  }
  if (reset) {
    if (/_test\b/.test(url)) throw new Error("Refusing to --reset a test database via the seed script.");
    const tables = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((x) => `"public"."${x.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    console.log("Wiped existing data.");
  }

  const realNow = Date.now();

  // ---- Users (created 45 days ago) ----
  t = realNow - 45 * 24 * HOUR;
  const ids = new Map<string, string>();
  for (const u of SEED_USERS) {
    t += between(5, 90) * MIN;
    const created = await registerUser({
      username: u.username,
      displayName: u.displayName,
      password: DEMO_PASSWORD,
      avatar: u.avatar,
      role: u.role,
    });
    await db.user.update({ where: { id: created.id }, data: { bio: u.bio, profileTheme: u.theme ?? "mahogany" } });
    ids.set(u.username, created.id);
  }
  const id = (username: string) => {
    const v = ids.get(username);
    if (!v) throw new Error(`Unknown seed user ${username}`);
    return v;
  };
  const everyone = [...ids.keys()];
  console.log(`Created ${everyone.length} players.`);

  async function play(c: SeedCase, start: number, opts: { stopAfter: "confession" | "defense" | "prosecution" | "votes" | "verdict"; votingUntil?: number }) {
    t = start;
    const created = await confess(id(c.accused), {
      title: c.title,
      category: c.category,
      confession: c.confession,
      context: c.context,
      anonymous: !!c.anonymous,
    });
    if (opts.stopAfter === "confession") return created;

    const attorney = c.attorney ?? shuffle(everyone.filter((u) => u !== c.accused))[0];
    t += between(0.5, 5) * HOUR;
    await claimCase(id(attorney), created.id, "DEFENSE");
    t += between(2, 14) * MIN;
    await submitArgument(id(attorney), created.id, "DEFENSE", c.defense!);
    if (opts.stopAfter === "defense") return created;

    const prosecutor = c.prosecutor ?? shuffle(everyone.filter((u) => u !== c.accused && u !== attorney))[0];
    t += between(0.5, 6) * HOUR;
    await claimCase(id(prosecutor), created.id, "PROSECUTION");
    t += between(2, 16) * MIN;
    await submitArgument(id(prosecutor), created.id, "PROSECUTION", c.prosecution!);
    if (opts.stopAfter === "prosecution") return created;

    const deliberationStart = t;
    const pool = shuffle(everyone.filter((u) => ![c.accused, attorney, prosecutor].includes(u)));
    const jurors = pool.slice(0, Math.min(c.jurors ?? 12, pool.length));
    const choices: ("GUILTY" | "NOT_GUILTY")[] = c.tally
      ? [...Array(c.tally[0]).fill("GUILTY"), ...Array(c.tally[1]).fill("NOT_GUILTY")]
      : jurors.map(() => (rand() < (c.guilt ?? 0.5) ? "GUILTY" : "NOT_GUILTY"));
    const windowEnd = opts.votingUntil ?? deliberationStart + 20 * HOUR;
    const times = jurors.map(() => between(deliberationStart + 5 * MIN, windowEnd)).sort((a, b) => a - b);
    for (let i = 0; i < jurors.length; i++) {
      t = times[i];
      await castVote(id(jurors[i]), created.id, choices[i]);
    }
    if (opts.stopAfter === "votes") return created;

    t = deliberationStart + 24 * HOUR + 10 * MIN;
    let outcome = await closeDeliberation(created.id);
    if (outcome.kind === "extended") {
      t += 24 * HOUR + 10 * MIN;
      outcome = await closeDeliberation(created.id);
    }

    // Reactions trickle in after the verdict.
    const fans = shuffle(everyone.filter((u) => ![c.accused, attorney, prosecutor].includes(u)));
    for (const [type, count] of Object.entries(c.reactions ?? {}) as [Parameters<typeof toggleReaction>[2], number][]) {
      for (const fan of fans.slice(0, Math.min(count, fans.length))) {
        t += between(1, 20) * MIN;
        await toggleReaction(id(fan), created.id, type);
      }
    }
    return created;
  }

  // ---- Closed cases spread across the last 30 days, oldest first ----
  const span = 27 * 24 * HOUR;
  const startAt = realNow - 32 * 24 * HOUR;
  for (let i = 0; i < CLOSED_CASES.length; i++) {
    const start = startAt + (span / CLOSED_CASES.length) * i + between(0, 3) * HOUR;
    await play(CLOSED_CASES[i], start, { stopAfter: "verdict" });
  }
  console.log(`Tried ${CLOSED_CASES.length} cases to verdict.`);

  // ---- Live cases (all timestamps before the real "now") ----
  for (const c of DELIBERATION_CASES) {
    const start = realNow - between(14, 20) * HOUR;
    await play(c, start, { stopAfter: "votes", votingUntil: realNow - 10 * MIN });
  }
  for (const c of AWAITING_PROSECUTION_CASES) {
    await play(c, realNow - between(8, 20) * HOUR, { stopAfter: "defense" });
  }
  for (const c of AWAITING_DEFENSE_CASES) {
    await play(c, realNow - between(0.5, 30) * HOUR, { stopAfter: "confession" });
  }
  console.log(
    `Opened ${DELIBERATION_CASES.length} jury cases, ${AWAITING_PROSECUTION_CASES.length} awaiting prosecution, ${AWAITING_DEFENSE_CASES.length} awaiting defense.`,
  );

  // A couple of open reports so the moderation console has something to review.
  t = realNow - 30 * MIN;
  const reported = await db.case.findFirst({ where: { title: AWAITING_DEFENSE_CASES[1].title }, select: { id: true } });
  if (reported) {
    await fileReport(id("quiet_quokka"), { caseId: reported.id, target: "CASE", reason: "REAL_PERSON", details: "Could this be about a real coworker? Feels identifiable." });
    await fileReport(id("mx_meowington"), { caseId: reported.id, target: "CASE", reason: "HARASSMENT" });
  }

  // Older notifications shouldn't all pop as toasts on first login.
  await db.notification.updateMany({
    where: { createdAt: { lt: new Date(realNow - 2 * HOUR) } },
    data: { toastedAt: new Date(realNow), readAt: new Date(realNow) },
  });

  resetClock();
  console.log(`\nDone! Demo password for every seeded account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
