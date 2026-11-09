import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { resetClock } from "@/server/clock";
import { castVote, claimCase, confess, releaseClaim, submitArgument } from "@/server/services/cases";
import { closeDeliberation } from "@/server/services/verdict";
import { expireStaleClaims, runMaintenanceNow } from "@/server/services/maintenance";
import { listJuryCases, listQueue } from "@/server/queries/cases";
import { auditStats } from "@/server/services/stats";
import {
  DEFENSE_TEXT,
  PROSECUTION_TEXT,
  achievementKeys,
  advance,
  closeNow,
  hours,
  makeCase,
  makeUser,
  makeUsers,
  minutes,
  resetDb,
  stats,
  toDeliberation,
  useFakeClock,
  voteAll,
} from "../support/helpers";

beforeEach(async () => {
  await resetDb();
  useFakeClock();
  process.env.COURT_QUORUM = "10";
  delete process.env.COURT_DELIBERATION_MINUTES;
  process.env.COURT_DELIBERATION_HOURS = "24";
  process.env.COURT_MAX_EXTENSIONS = "1";
  process.env.COURT_CLAIM_MINUTES = "30";
});
afterAll(async () => {
  resetClock();
  await db.$disconnect();
});

describe("complete case lifecycle", () => {
  it("runs confession → defense → prosecution → jury → verdict → archive", async () => {
    const accused = await makeUser("hammy");
    const attorney = await makeUser("pigeon_esq");
    const prosecutor = await makeUser("da_raccoon");
    const jurors = await makeUsers(12);

    const created = await confess(accused, {
      title: "I ate my roommate's pizza and blamed his girlfriend",
      category: "food-crimes",
      confession:
        "There were two slices left. I ate both at 3am, then left the box next to her bag so the evidence pointed elsewhere.",
      context: "She doesn't even like pepperoni, which makes it worse.",
      anonymous: false,
    });
    expect(created.number).toBe(1);
    let c = await db.case.findUniqueOrThrow({ where: { id: created.id } });
    expect(c.status).toBe("AWAITING_DEFENSE");
    expect(c.slug).toBe("i-ate-my-roommates-pizza-and-blamed-his-girlfriend");

    // Defense
    await claimCase(attorney, c.id, "DEFENSE");
    c = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(c.status).toBe("DEFENSE_CLAIMED");
    expect(c.claimedById).toBe(attorney);
    advance(minutes(5));
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    c = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(c.status).toBe("AWAITING_PROSECUTION");
    expect(c.attorneyId).toBe(attorney);
    expect(c.claimedById).toBeNull();

    // Prosecution
    await claimCase(prosecutor, c.id, "PROSECUTION");
    advance(minutes(2));
    await submitArgument(prosecutor, c.id, "PROSECUTION", PROSECUTION_TEXT);
    c = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(c.status).toBe("DELIBERATION");
    expect(c.deliberationEndsAt!.getTime() - c.deliberationStartsAt!.getTime()).toBe(hours(24));

    // Jury: 9 guilty, 3 not guilty
    await voteAll(c.id, jurors, 9);
    c = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(c.guiltyVotes).toBe(9);
    expect(c.notGuiltyVotes).toBe(3);

    // Not due yet
    expect((await closeDeliberation(c.id)).kind).toBe("not-due");

    const outcome = await closeNow(c.id);
    expect(outcome).toMatchObject({ kind: "closed", verdict: "GUILTY", guilty: 9, notGuilty: 3 });
    c = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(c.status).toBe("CLOSED");
    expect(c.verdict).toBe("GUILTY");
    expect(c.closedAt).not.toBeNull();
    expect(c.controversy).toBeCloseTo(0.5);

    // Stats
    const s = await stats(prosecutor);
    expect(s.prosecutionWins).toBe(1);
    expect(s.currentProsecutionStreak).toBe(1);
    expect(s.reputation).toBe(12);
    expect(s.xp).toBe(25 + 60);
    const a = await stats(attorney);
    expect(a.defenseLosses).toBe(1);
    expect(a.currentDefenseStreak).toBe(0);
    expect(a.xp).toBe(25 + 15);
    const d = await stats(accused);
    expect(d.timesConvicted).toBe(1);
    expect(d.casesConfessed).toBe(1);
    const majorityJuror = await stats(jurors[0]);
    expect(majorityJuror.juryMajorityVotes).toBe(1);
    expect(majorityJuror.xp).toBe(10);
    const minorityJuror = await stats(jurors[11]);
    expect(minorityJuror.juryMajorityVotes).toBe(0);
    expect(minorityJuror.xp).toBe(5);

    // Achievements
    expect(await achievementKeys(accused)).toEqual(["opening-statement", "snack-attack"]);
    expect(await achievementKeys(prosecutor)).toEqual(["first-conviction", "objection-overruled", "speed-lawyer"]);

    // Notifications reached everyone
    const verdictNotes = await db.notification.count({ where: { type: "VERDICT" } });
    expect(verdictNotes).toBe(3 + 12);

    // Every participant's counters match a recomputation from history.
    for (const id of [accused, attorney, prosecutor, ...jurors]) {
      expect(await auditStats(id)).toEqual({ ok: true, mismatches: [] });
    }
  });

  it("awards a defense victory on a not-guilty majority and a mistrial on a tie", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(10);
    const one = await makeCase(accused);
    await toDeliberation(one.id, attorney, prosecutor);
    await voteAll(one.id, jurors, 1); // 1 guilty, 9 not guilty
    expect(await closeNow(one.id)).toMatchObject({ verdict: "NOT_GUILTY" });
    expect((await stats(attorney)).defenseWins).toBe(1);
    expect((await stats(prosecutor)).prosecutionLosses).toBe(1);
    expect((await stats(prosecutor)).reputation).toBe(0); // floored at zero
    expect(await achievementKeys(attorney)).toContain("peoples-champion");
    expect(await achievementKeys(accused)).toContain("clean-record");

    const two = await makeCase(accused);
    await toDeliberation(two.id, attorney, prosecutor);
    await voteAll(two.id, jurors, 5); // 5–5
    expect(await closeNow(two.id)).toMatchObject({ verdict: "MISTRIAL" });
    const s = await stats(attorney);
    expect(s.defenseMistrials).toBe(1);
    expect(s.currentDefenseStreak).toBe(1); // mistrial neither extends nor breaks
    expect(await achievementKeys(attorney)).toContain("hung-out-to-dry");
    for (const id of [accused, attorney, prosecutor, ...jurors]) expect((await auditStats(id)).ok).toBe(true);
  });

  it("extends deliberation once below quorum, then dismisses", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(4);
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, jurors, 3);

    const first = await closeNow(c.id);
    expect(first.kind).toBe("extended");
    let row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("DELIBERATION");
    expect(row.extensionsUsed).toBe(1);
    expect(await db.notification.count({ where: { type: "DELIBERATION_EXTENDED" } })).toBe(3);

    // Votes still accepted during the extension.
    const late = await makeUser();
    await castVote(late, c.id, "GUILTY");

    const second = await closeNow(c.id);
    expect(second).toMatchObject({ kind: "closed", verdict: "DISMISSED", guilty: 4, notGuilty: 1 });
    expect((await stats(attorney)).defenseLosses).toBe(0);
    expect((await stats(prosecutor)).prosecutionWins).toBe(0);
    expect((await stats(prosecutor)).xp).toBe(25 + 10);
    row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.verdict).toBe("DISMISSED");
  });

  it("reaches a verdict after an extension when quorum arrives", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(10);
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, jurors.slice(0, 4), 4);
    expect((await closeNow(c.id)).kind).toBe("extended");
    await voteAll(c.id, jurors.slice(4), 0);
    expect(await closeNow(c.id)).toMatchObject({ verdict: "NOT_GUILTY", guilty: 4, notGuilty: 6 });
  });

  it("does not double-award when many closers race", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(10);
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, jurors, 10);
    advance(hours(25));
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => closeDeliberation(c.id)));
    const closed = results.filter((r) => r.status === "fulfilled" && r.value.kind === "closed");
    expect(closed).toHaveLength(1);
    expect((await stats(prosecutor)).prosecutionWins).toBe(1);
    expect(await db.xpEvent.count({ where: { userId: prosecutor, reason: "case-won" } })).toBe(1);
  });
});

describe("role restrictions", () => {
  it("prevents the accused from defending or prosecuting their own case", async () => {
    const accused = await makeUser();
    const c = await makeCase(accused);
    await expect(claimCase(accused, c.id, "DEFENSE")).rejects.toMatchObject({ code: "INELIGIBLE" });
    const attorney = await makeUser();
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    await expect(claimCase(accused, c.id, "PROSECUTION")).rejects.toMatchObject({ code: "INELIGIBLE" });
    await expect(claimCase(attorney, c.id, "PROSECUTION")).rejects.toMatchObject({ code: "INELIGIBLE" });
  });

  it("enforces the stage order", async () => {
    const [accused, a, b] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await expect(claimCase(a, c.id, "PROSECUTION")).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: "This case still needs a defense before a prosecutor can take it.",
    });
    await expect(submitArgument(a, c.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(castVote(b, c.id, "GUILTY")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await claimCase(a, c.id, "DEFENSE");
    // Someone without the claim cannot file.
    await expect(submitArgument(b, c.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await submitArgument(a, c.id, "DEFENSE", DEFENSE_TEXT);
    // Exactly one defense.
    await expect(submitArgument(a, c.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ code: "ALREADY_DONE" });
    await expect(claimCase(b, c.id, "DEFENSE")).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: "This case has already moved past the defense attorney stage.",
    });
  });

  it("stops participants from voting and enforces one vote per account", async () => {
    const [accused, attorney, prosecutor, juror] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    for (const p of [accused, attorney, prosecutor]) {
      await expect(castVote(p, c.id, "GUILTY")).rejects.toMatchObject({ code: "INELIGIBLE" });
    }
    await castVote(juror, c.id, "GUILTY");
    await expect(castVote(juror, c.id, "NOT_GUILTY")).rejects.toMatchObject({ code: "ALREADY_DONE" });

    // Concurrent duplicates from one account: exactly one is counted.
    const juror2 = await makeUser();
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => castVote(juror2, c.id, "NOT_GUILTY")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(await db.vote.count({ where: { caseId: c.id } })).toBe(2);
    expect(row.guiltyVotes + row.notGuiltyVotes).toBe(2);
    expect((await stats(juror2)).juryVotes).toBe(1);
  });

  it("rejects votes after the window closes", async () => {
    const [accused, attorney, prosecutor, juror] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    advance(hours(24) + 1);
    await expect(castVote(juror, c.id, "GUILTY")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("blocks banned players", async () => {
    const [accused, banned] = [await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await db.user.update({ where: { id: banned }, data: { bannedAt: new Date() } });
    await expect(claimCase(banned, c.id, "DEFENSE")).rejects.toMatchObject({ code: "BANNED" });
    await expect(makeCase(banned)).rejects.toMatchObject({ code: "BANNED" });
  });
});

describe("claims under concurrency and expiry", () => {
  it("lets exactly one of many simultaneous claimers win", async () => {
    const accused = await makeUser();
    const c = await makeCase(accused);
    const claimers = await makeUsers(12, "racer");
    const results = await Promise.allSettled(claimers.map((id) => claimCase(id, c.id, "DEFENSE")));
    const winners = results.filter((r) => r.status === "fulfilled");
    expect(winners).toHaveLength(1);
    const losers = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(losers.every((l) => l.reason.code === "CONFLICT")).toBe(true);
    expect(await db.caseClaim.count({ where: { caseId: c.id, outcome: "ACTIVE" } })).toBe(1);
  });

  it("limits each player to one active claim per role, even when racing", async () => {
    const accused = await makeUser();
    const cases = [await makeCase(accused), await makeCase(accused), await makeCase(accused)];
    const greedy = await makeUser();
    const results = await Promise.allSettled(cases.map((c) => claimCase(greedy, c.id, "DEFENSE")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.case.count({ where: { claimedById: greedy } })).toBe(1);
  });

  it("requeues abandoned claims and lets others pick them up", async () => {
    const [accused, slowpoke, rescuer] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(slowpoke, c.id, "DEFENSE");
    // Not yet expired: others are blocked.
    await expect(claimCase(rescuer, c.id, "DEFENSE")).rejects.toMatchObject({ code: "CONFLICT" });
    advance(minutes(31));
    // Expired but inside the grace period: still the slowpoke's to file.
    await expect(claimCase(rescuer, c.id, "DEFENSE")).rejects.toMatchObject({ code: "CONFLICT" });
    advance(minutes(2));
    // Past the grace period: lazily reclaimable even before the sweep runs.
    await claimCase(rescuer, c.id, "DEFENSE");
    const claims = await db.caseClaim.findMany({ where: { caseId: c.id }, orderBy: { claimedAt: "asc" } });
    expect(claims.map((x) => x.outcome)).toEqual(["EXPIRED", "ACTIVE"]);
    await expect(submitArgument(slowpoke, c.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await submitArgument(rescuer, c.id, "DEFENSE", DEFENSE_TEXT);
    expect(await db.notification.count({ where: { userId: slowpoke, type: "CLAIM_EXPIRED" } })).toBe(1);
  });

  it("sweeps expired claims back to the queue, honouring the grace period", async () => {
    const [accused, writer, late] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(writer, c.id, "DEFENSE");
    advance(minutes(31)); // expired, but within the 2-minute grace
    expect(await expireStaleClaims()).toBe(0);
    // Nobody can snatch it during the grace period, and it isn't advertised as open.
    await expect(claimCase(late, c.id, "DEFENSE")).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await listQueue({ role: "DEFENSE", viewer: null })).cards.map((x) => x.id)).not.toContain(c.id);
    // The holder can't start a second defense while this one is still theirs.
    const other = await makeCase(accused);
    await expect(claimCase(writer, other.id, "DEFENSE")).rejects.toMatchObject({ code: "INELIGIBLE" });
    await submitArgument(writer, c.id, "DEFENSE", DEFENSE_TEXT); // grace honoured

    await claimCase(late, c.id, "PROSECUTION");
    advance(minutes(33));
    expect(await expireStaleClaims()).toBe(1);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("AWAITING_PROSECUTION");
    expect(row.claimedById).toBeNull();
    await expect(submitArgument(late, c.id, "PROSECUTION", PROSECUTION_TEXT)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("allows releasing a claim", async () => {
    const [accused, a, b] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(a, c.id, "DEFENSE");
    await releaseClaim(a, c.id);
    await claimCase(b, c.id, "DEFENSE");
    await expect(releaseClaim(a, c.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});

describe("confession rules", () => {
  it("rejects personal info, duplicates and too many confessions per day", async () => {
    const accused = await makeUser();
    await expect(
      confess(accused, {
        title: "I prank called my neighbour",
        category: "social-misconduct",
        confession: "I called him on 555-123-4567 and pretended to be a pizza shop for an hour.",
        anonymous: false,
      }),
    ).rejects.toMatchObject({ code: "CONTENT_REJECTED" });

    const first = await makeCase(accused);
    const original = await db.case.findUniqueOrThrow({ where: { id: first.id } });
    await expect(
      confess(accused, { title: original.title, category: "petty-theft", confession: original.confession, anonymous: false }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    for (let i = 0; i < 4; i++) await makeCase(accused);
    await expect(makeCase(accused)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    advance(hours(25));
    await makeCase(accused);
  });

  it("orders the jury queue by total votes, never revealing the hidden split (audit 6 #7)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(3, "jq");
    const mk = async (guilty: number, notGuilty: number) => {
      const c = await makeCase(accused);
      await toDeliberation(c.id, attorney, prosecutor);
      for (let i = 0; i < guilty + notGuilty; i++) await castVote(jurors[i], c.id, i < guilty ? "GUILTY" : "NOT_GUILTY");
      return c.number;
    };
    const twoGuilty = await mk(2, 0);
    const threeAcquit = await mk(0, 3);
    const oneAcquit = await mk(0, 1);
    const order = (await listJuryCases(null)).cards.map((c) => c.number);
    expect(order).toEqual([oneAcquit, twoGuilty, threeAcquit]);
  });

  it("keeps anonymous confessions out of public defendant stats", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const jurors = await makeUsers(10);
    const c = await makeCase(accused, { anonymous: true, category: "food-crimes" });
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, jurors, 10);
    await closeNow(c.id);
    const s = await stats(accused);
    expect(s.totalConfessions).toBe(1);
    expect(s.casesConfessed).toBe(0);
    expect(s.timesConvicted).toBe(0);
    // Nothing public changes for an anonymous confessor, at filing or at verdict (audit 6 #6).
    expect(await achievementKeys(accused)).toEqual([]);
    expect(s.xp).toBe(0);
    expect(await db.xpEvent.count({ where: { userId: accused } })).toBe(0);
    expect(await db.notification.count({ where: { userId: accused, type: "VERDICT" } })).toBe(1); // still told privately
    expect((await auditStats(accused)).ok).toBe(true);
    // A public confession does earn them.
    await makeCase(accused, { anonymous: false });
    expect(await achievementKeys(accused)).toEqual(["opening-statement"]);
    expect((await stats(accused)).xp).toBeGreaterThan(0);
  });
});

describe("statistics stay consistent across many games", () => {
  it("matches a full recomputation after a randomised season", async () => {
    process.env.COURT_QUORUM = "3";
    const players = await makeUsers(9, "season");
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let round = 0; round < 14; round++) {
      const shuffled = [...players].sort(() => rand() - 0.5);
      const [accused, attorney, prosecutor, ...rest] = shuffled;
      const c = await makeCase(accused, { anonymous: rand() < 0.3 });
      await toDeliberation(c.id, attorney, prosecutor);
      const jurorCount = Math.floor(rand() * 6); // sometimes below quorum
      const jurors = rest.slice(0, jurorCount);
      for (const j of jurors) await castVote(j, c.id, rand() < 0.5 ? "GUILTY" : "NOT_GUILTY");
      advance(hours(25));
      await runMaintenanceNow();
      advance(hours(25));
      await runMaintenanceNow();
      advance(hours(1));
    }
    expect(await db.case.count({ where: { status: "DELIBERATION" } })).toBe(0);
    for (const id of players) {
      const audit = await auditStats(id);
      expect(audit, `stats for ${id}`).toEqual({ ok: true, mismatches: [] });
    }
  });
});
