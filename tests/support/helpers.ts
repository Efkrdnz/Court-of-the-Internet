import { db } from "@/server/db";
import { setClock } from "@/server/clock";
import { registerUser } from "@/server/services/accounts";
import { castVote, claimCase, confess, submitArgument } from "@/server/services/cases";
import { closeDeliberation } from "@/server/services/verdict";

let fakeNow = new Date("2026-03-01T12:00:00Z").getTime();

export function useFakeClock(start = "2026-03-01T12:00:00Z") {
  fakeNow = new Date(start).getTime();
  setClock(() => new Date(fakeNow));
}

export function advance(ms: number) {
  fakeNow += ms;
}
export const minutes = (n: number) => n * 60_000;
export const hours = (n: number) => n * 3_600_000;

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let userCounter = 0;
export async function makeUser(name?: string, role: "PLAYER" | "ADMIN" | "MODERATOR" = "PLAYER") {
  userCounter++;
  const username = (name ?? `player_${userCounter}`).toLowerCase();
  const user = await registerUser({ username, displayName: username, password: "objection!", role });
  return user.id;
}

export async function makeUsers(n: number, prefix = "juror") {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(await makeUser(`${prefix}_${userCounter + 1}_${i}`));
  return ids;
}

let confessionCounter = 0;
export async function makeCase(accusedId: string, overrides: Partial<Parameters<typeof confess>[1]> = {}) {
  confessionCounter++;
  const words = ["pizza", "controller", "fries", "spoiler", "thermostat", "hoodie", "charger", "oat milk", "discord", "remote"];
  const thing = words[confessionCounter % words.length];
  const vocab =
    "sneakily quietly boldly roommate cousin neighbour cat goose snack sandwich nachos waffle karaoke lamp sock blanket sofa fridge balcony tuesday midnight birthday wedding picnic tournament bus elevator library kitchen garage".split(
      " ",
    );
  const pick = () => vocab[Math.floor(Math.random() * vocab.length)];
  const salad = Array.from({ length: 14 }, pick).join(" ");
  return confess(accusedId, {
    title: `I borrowed the ${thing} permanently (${confessionCounter})`,
    category: "petty-theft",
    confession: `Exhibit ${confessionCounter}: I took the ${thing}. Details: ${salad}.`,
    anonymous: false,
    ...overrides,
  });
}

export const DEFENSE_TEXT =
  "Your honour, my client was merely safeguarding the item from a far more dangerous custodian. This was a rescue, not a theft.";
export const PROSECUTION_TEXT =
  "The defense calls it a rescue. The crumbs on the defendant's shirt call it what it is: a premeditated snack heist of the highest order.";

/** Takes a case through defense + prosecution into deliberation. */
export async function toDeliberation(caseId: string, attorneyId: string, prosecutorId: string) {
  await claimCase(attorneyId, caseId, "DEFENSE");
  await submitArgument(attorneyId, caseId, "DEFENSE", DEFENSE_TEXT);
  await claimCase(prosecutorId, caseId, "PROSECUTION");
  await submitArgument(prosecutorId, caseId, "PROSECUTION", PROSECUTION_TEXT);
}

export async function voteAll(caseId: string, jurors: string[], guiltyCount: number) {
  for (let i = 0; i < jurors.length; i++) {
    await castVote(jurors[i], caseId, i < guiltyCount ? "GUILTY" : "NOT_GUILTY");
  }
}

export async function closeNow(caseId: string) {
  advance(hours(25));
  return closeDeliberation(caseId);
}

export async function stats(userId: string) {
  return db.userStats.findUniqueOrThrow({ where: { userId } });
}

export async function achievementKeys(userId: string) {
  const rows = await db.userAchievement.findMany({ where: { userId }, select: { key: true } });
  return rows.map((r) => r.key).sort();
}
