import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { resetClock } from "@/server/clock";
import { getLeaderboards } from "@/server/queries/players";
import { toggleReaction } from "@/server/services/reactions";
import { wilsonLowerBound, LEADERBOARD_MIN_DECIDED, LEADERBOARD_MIN_JURY_VOTES } from "@/lib/progression";
import { closeNow, makeCase, makeUser, makeUsers, resetDb, toDeliberation, useFakeClock, voteAll } from "../support/helpers";

beforeEach(async () => {
  await resetDb();
  useFakeClock();
  process.env.COURT_QUORUM = "3";
});
afterAll(async () => {
  resetClock();
  await db.$disconnect();
});

async function setStats(userId: string, data: Parameters<typeof db.userStats.update>[0]["data"]) {
  await db.userStats.update({ where: { userId }, data });
}

describe("leaderboards", () => {
  it("ranks attorneys and prosecutors by Wilson lower bound and enforces the participation threshold", async () => {
    const [rookie, veteran, perfectSmall, coinflip, belowThreshold] = [
      await makeUser("rookie"),
      await makeUser("veteran"),
      await makeUser("perfect_small"),
      await makeUser("coinflip"),
      await makeUser("below_threshold"),
    ];
    await setStats(rookie, { defenseWins: 1, defenseLosses: 0 }); // 1 decided: excluded
    await setStats(belowThreshold, { defenseWins: 2, defenseLosses: 0 }); // 2 decided: excluded
    await setStats(veteran, { defenseWins: 40, defenseLosses: 8 });
    await setStats(perfectSmall, { defenseWins: 3, defenseLosses: 0 });
    await setStats(coinflip, { defenseWins: 10, defenseLosses: 10 });
    await setStats(veteran, { prosecutionWins: 2, prosecutionLosses: 1 });
    await setStats(coinflip, { prosecutionWins: 5, prosecutionLosses: 0 });

    const lb = await getLeaderboards();
    expect(LEADERBOARD_MIN_DECIDED).toBe(3);
    // 40–8 veteran outranks a perfect 3–0 record, which outranks 10–10.
    expect(lb.attorneys.map((a) => a.username)).toEqual(["veteran", "perfect_small", "coinflip"]);
    expect(lb.attorneys.map((a) => a.username)).not.toContain("rookie");
    expect(lb.attorneys.map((a) => a.username)).not.toContain("below_threshold");
    expect(lb.attorneys[0]).toMatchObject({ wins: 40, losses: 8 });
    expect(lb.attorneys[0].rate).toBeCloseTo(40 / 48);
    expect(lb.attorneys[0].score).toBeCloseTo(wilsonLowerBound(40, 48));
    // Scores are non-increasing.
    for (let i = 1; i < lb.attorneys.length; i++) expect(lb.attorneys[i - 1].score).toBeGreaterThanOrEqual(lb.attorneys[i].score);

    expect(lb.prosecutors.map((p) => p.username)).toEqual(["coinflip", "veteran"]);
  });

  it("excludes banned and deleted players and applies the juror threshold", async () => {
    const [good, banned, deleted, casualJuror, busyJuror] = await makeUsers(5, "lbx");
    for (const id of [good, banned, deleted]) await setStats(id, { defenseWins: 5, defenseLosses: 1, juryVotes: 20, juryMajorityVotes: 15, timesConvicted: 2, xp: 100, reputation: 30 });
    await db.user.update({ where: { id: banned }, data: { bannedAt: new Date() } });
    await db.user.update({ where: { id: deleted }, data: { deletedAt: new Date() } });
    await setStats(casualJuror, { juryVotes: LEADERBOARD_MIN_JURY_VOTES - 1, juryMajorityVotes: 4 });
    await setStats(busyJuror, { juryVotes: 30, juryMajorityVotes: 12 });

    const lb = await getLeaderboards();
    const names = (rows: { username: string }[]) => rows.map((r) => r.username);
    const goodName = (await db.user.findUniqueOrThrow({ where: { id: good } })).username;
    const busyName = (await db.user.findUniqueOrThrow({ where: { id: busyJuror } })).username;
    const casualName = (await db.user.findUniqueOrThrow({ where: { id: casualJuror } })).username;
    for (const board of [lb.attorneys, lb.jurors, lb.convicts, lb.reputation]) {
      expect(board).toHaveLength(board === lb.jurors ? 2 : 1);
      expect(names(board)).toContain(goodName);
    }
    expect(names(lb.jurors)).toEqual([busyName, goodName]); // sorted by votes; casual juror below threshold
    expect(names(lb.jurors)).not.toContain(casualName);
    // Agreement is measured over decided cases only; these synthetic stats have no real votes,
    // so it is unknown (null) rather than a misleading 12/30.
    expect(lb.jurors[0].agreement).toBeNull();
  });

  it("builds every board from real games, keeping anonymous convictions off the public board", async () => {
    const [publicCulprit, anonCulprit, attorney, prosecutor] = [await makeUser("public_culprit"), await makeUser("anon_culprit"), await makeUser("lb_attorney"), await makeUser("lb_prosecutor")];
    const jurors = await makeUsers(5, "lbj");
    const fans = await makeUsers(3, "fan");

    // Prosecutor wins 3 straight; one of them is against an anonymous defendant.
    const cases = [];
    for (const [accused, anonymous] of [
      [publicCulprit, false],
      [publicCulprit, false],
      [anonCulprit, true],
    ] as const) {
      const c = await makeCase(accused, { anonymous });
      await toDeliberation(c.id, attorney, prosecutor);
      await voteAll(c.id, jurors, 4);
      expect(await closeNow(c.id)).toMatchObject({ verdict: "GUILTY" });
      cases.push(c);
    }
    // Reactions: the second case is more entertaining than the first.
    await toggleReaction(fans[0], cases[1].id, "LEGENDARY");
    await toggleReaction(fans[1], cases[1].id, "HILARIOUS");
    await toggleReaction(fans[2], cases[0].id, "RELATABLE");

    const lb = await getLeaderboards();
    expect(lb.prosecutors[0]).toMatchObject({ username: "lb_prosecutor", wins: 3, losses: 0, streak: 3 });
    // 0–3 qualifies on volume but a "best" board needs at least one win (audit 8 #7).
    expect(lb.attorneys.map((a) => a.username)).not.toContain("lb_attorney");
    expect(lb.streaks[0]).toMatchObject({ username: "lb_prosecutor", streak: 3, side: "Prosecution" });
    expect(lb.convicts.map((c) => [c.username, c.convictions])).toEqual([["public_culprit", 2]]);
    expect(lb.convicts.map((c) => c.username)).not.toContain("anon_culprit");
    expect(lb.jurors).toHaveLength(0); // only 3 votes each: below the 5-vote juror threshold
    expect(lb.entertaining.map((c) => c.id)).toEqual([cases[1].id, cases[0].id]);
    expect(lb.entertaining[0].reactionScore).toBe(5);
    // The anonymous case appears on no board with a linkable defendant.
    expect(lb.entertaining.every((c) => !c.anonymous || c.accused.username === null)).toBe(true);
  });
});
