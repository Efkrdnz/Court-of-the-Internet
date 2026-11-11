import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { clock, resetClock } from "@/server/clock";
import { castVote, claimCase, submitArgument } from "@/server/services/cases";
import { closeDeliberation } from "@/server/services/verdict";
import { runMaintenanceNow } from "@/server/services/maintenance";
import { toggleReaction } from "@/server/services/reactions";
import { bumpViewCount, getCaseDetail, listJuryCases, listQueue, pickRandomQueueCase } from "@/server/queries/cases";
import {
  adjournNow,
  assertNotYetReported,
  dismissReports,
  fileReport,
  grantEntitlement,
  pinFeaturedCase,
  removeCase,
  restoreCase,
  revealConfessor,
  setBan,
  setUserRole,
  strikeArgument,
} from "@/server/services/moderation";
import { hitRateLimit } from "@/server/rate-limit";
import { loginWithLimits } from "@/server/services/login";
import { auditStats } from "@/server/services/stats";
import { getCommunityStats, getFeaturedCase, getHighlights, utcDay } from "@/server/queries/community";
import { getLeaderboards } from "@/server/queries/players";
import { assertNotStaffName, authenticate, changePassword, deleteAccount, registerUser, updateProfile } from "@/server/services/accounts";
import { createSession, resolveSession } from "@/server/auth/sessions";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { DEFENSE_TEXT, PROSECUTION_TEXT, advance, closeNow, achievementKeys, hours, stats, makeCase, makeUser, makeUsers, minutes, resetDb, toDeliberation, useFakeClock, voteAll } from "../support/helpers";

beforeEach(async () => {
  await resetDb();
  useFakeClock();
  process.env.COURT_QUORUM = "10";
  process.env.COURT_MAX_EXTENSIONS = "1";
});
afterAll(async () => {
  resetClock();
  await db.$disconnect();
});

describe("reactions", () => {
  it("toggles reactions and keeps counters in sync", async () => {
    const [accused, attorney, prosecutor, fan] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await expect(toggleReaction(fan, c.id, "HILARIOUS")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await toDeliberation(c.id, attorney, prosecutor);
    expect(await toggleReaction(fan, c.id, "HILARIOUS")).toMatchObject({ active: true, counts: { hilariousCount: 1 } });
    expect(await toggleReaction(fan, c.id, "LEGENDARY")).toMatchObject({ active: true, counts: { legendaryCount: 1 } });
    let row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.reactionScore).toBe(5);
    expect(await toggleReaction(fan, c.id, "HILARIOUS")).toMatchObject({ active: false, counts: { hilariousCount: 0 } });
    row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.reactionScore).toBe(3);
    await expect(toggleReaction(attorney, c.id, "LEGENDARY")).rejects.toMatchObject({ code: "INELIGIBLE" });
  });

  it("counts a case view once per viewer per window", async () => {
    const [accused, other] = [await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await bumpViewCount(c.id, `u:${other}`);
    await bumpViewCount(c.id, `u:${other}`); // reload
    await bumpViewCount(c.id, "ip:203.0.113.9");
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).viewCount).toBe(2);
    advance(minutes(6 * 60 + 1));
    await bumpViewCount(c.id, `u:${other}`);
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).viewCount).toBe(3);
  });

  it("survives a burst of concurrent toggles from one player without errors or drift", async () => {
    const [accused, attorney, prosecutor, fan] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    let before = 0;
    for (let round = 0; round < 3; round++) {
      const results = await Promise.allSettled(Array.from({ length: 9 }, () => toggleReaction(fan, c.id, "LEGENDARY")));
      expect(results.filter((r) => r.status === "rejected")).toEqual([]);
      const rows = await db.reaction.count({ where: { caseId: c.id, type: "LEGENDARY" } });
      const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
      expect(rows).toBeLessThanOrEqual(1);
      expect(row.legendaryCount).toBe(rows);
      expect(row.reactionScore).toBe(rows * 3);
      // Each toggle reports the state it actually left (audit 19 #6): they alternate on/off,
      // so the last one to run matches the final state.
      const actives = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.active] : []));
      expect(actives.filter((a) => a).length - actives.filter((a) => !a).length).toBe(rows - before);
      before = rows;
    }
  });

  it("grants Legendary Litigator at 10 legendary reactions", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const fans = await makeUsers(10, "fan");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    for (const f of fans) await toggleReaction(f, c.id, "LEGENDARY");
    for (const id of [accused, attorney, prosecutor]) expect(await achievementKeys(id)).toContain("legendary-litigator");
  });
});

describe("moderation", () => {
  it("auto-hides a case after three distinct reports and blocks gameplay", async () => {
    const accused = await makeUser();
    const reporters = await makeUsers(3, "reporter");
    advance(hours(25)); // established accounts
    const c = await makeCase(accused);
    await fileReport(reporters[0], { caseId: c.id, target: "CASE", reason: "REAL_PERSON" });
    await expect(fileReport(reporters[0], { caseId: c.id, target: "CASE", reason: "SPAM" })).rejects.toMatchObject({
      code: "ALREADY_DONE",
    });
    await fileReport(reporters[1], { caseId: c.id, target: "CASE", reason: "HARASSMENT" });
    // The accused's own report reaches the queue but doesn't count toward hiding it (audit 34 D6).
    expect(await fileReport(accused, { caseId: c.id, target: "CASE", reason: "SPAM" })).toEqual({ autoReview: false });
    const result = await fileReport(reporters[2], { caseId: c.id, target: "CASE", reason: "PERSONAL_INFO" });
    expect(result.autoReview).toBe(true);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.moderationState).toBe("UNDER_REVIEW");
    expect(row.openReports).toBe(4); // the accused's report counts in the queue
    const lawyer = await makeUser();
    await expect(claimCase(lawyer, c.id, "DEFENSE")).rejects.toMatchObject({ code: "INVALID_STATE" });

    const mod = await makeUser("the_clerk", "MODERATOR");
    await dismissReports(mod, c.id);
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).moderationState).toBe("VISIBLE");
    await claimCase(lawyer, c.id, "DEFENSE");
  });

  it("throwaway or already-dismissed reporters can't freeze a trial (audit 8 #3)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const mod = await makeUser("abuse_clerk", "MODERATOR");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    // Brand-new accounts: reports are recorded for moderators but don't hide the case.
    const fresh = await makeUsers(3, "throwaway");
    for (const r of fresh) expect(await fileReport(r, { caseId: c.id, target: "CASE", reason: "SPAM" })).toEqual({ autoReview: false });
    let row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ moderationState: "VISIBLE", openReports: 3, deliberationPausedAt: null });

    // A day later they're established, but their reports here were already dismissed once.
    await dismissReports(mod, c.id);
    advance(hours(25));
    for (const r of fresh) await fileReport(r, { caseId: c.id, target: "DEFENSE", reason: "SPAM" });
    row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.moderationState).toBe("VISIBLE");

    // Reporting an argument that doesn't exist is rejected.
    const early = await makeCase(accused);
    await expect(fileReport(fresh[0], { caseId: early.id, target: "PROSECUTION", reason: "SPAM" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("lets staff remove cases, strike arguments, ban users and adjourn; players cannot", async () => {
    const [accused, attorney, prosecutor, player] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("chief_justice", "ADMIN");
    const c = await makeCase(accused);
    await expect(removeCase(player, c.id, "nope")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await toDeliberation(c.id, attorney, prosecutor);

    await strikeArgument(admin, c.id, "DEFENSE");
    expect((await db.argument.findFirstOrThrow({ where: { caseId: c.id, role: "DEFENSE" } })).stricken).toBe(true);
    // A second strike is refused, not logged again (audit 33 D7).
    await expect(strikeArgument(admin, c.id, "DEFENSE")).rejects.toMatchObject({ code: "INVALID_STATE" });

    const jurors = await makeUsers(10);
    await voteAll(c.id, jurors, 7);
    // Two moderators adjourning at once: one close, one audit entry, both told the verdict (audit 28 #6).
    const outcomes = await Promise.all([adjournNow(admin, c.id), adjournNow(admin, c.id)]);
    // One press closes it; the other is told it had closed (never that it closed it too).
    expect(outcomes.filter((o) => o.kind === "closed")).toHaveLength(1);
    for (const outcome of outcomes) expect(outcome).toMatchObject({ kind: expect.stringMatching(/^(closed|already-closed)$/), verdict: "GUILTY" });
    expect(await db.moderationAction.count({ where: { action: "ADJOURN_NOW", caseId: c.id } })).toBe(1);
    // A later adjourn (the close already committed) is told the verdict too, and logs nothing (audit 34 D4).
    expect(await adjournNow(admin, c.id)).toMatchObject({ kind: "already-closed", verdict: "GUILTY" });
    expect(await db.moderationAction.count({ where: { action: "ADJOURN_NOW", caseId: c.id } })).toBe(1);

    await removeCase(admin, c.id, "Names a real person");
    const removed = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(removed.moderationState).toBe("REMOVED");
    expect(await db.moderationAction.count()).toBe(3);

    // Banning releases held claims and ends sessions.
    const other = await makeCase(accused);
    await claimCase(player, other.id, "DEFENSE");
    await createSession(player);
    await setBan(admin, player, true, "Contempt");
    expect((await db.case.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("AWAITING_DEFENSE");
    expect(await db.session.count({ where: { userId: player } })).toBe(0);
    await expect(castVote(player, c.id, "GUILTY")).rejects.toMatchObject({ code: "BANNED" });
  });

  it("sealing a claimed case releases the claim, so restoring it leaves the case playable (audit 5 #1)", async () => {
    const [accused, holder, rescuer] = [await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("seal_admin", "ADMIN");
    const c = await makeCase(accused);
    await claimCase(holder, c.id, "DEFENSE");
    // Restoring a case that isn't sealed is refused (audit 20 #4).
    await expect(restoreCase(admin, c.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await removeCase(admin, c.id, "Checking something");
    await expect(removeCase(admin, c.id, "Again")).rejects.toMatchObject({ code: "ALREADY_DONE" }); // no duplicate notice
    let row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: "AWAITING_DEFENSE", claimedById: null, moderationState: "REMOVED" });
    expect(await db.caseClaim.count({ where: { caseId: c.id, outcome: "ACTIVE" } })).toBe(0);
    expect(await db.notification.count({ where: { userId: holder, type: "MODERATION" } })).toBe(1);
    await expect(claimCase(rescuer, c.id, "DEFENSE")).rejects.toMatchObject({ code: "NOT_FOUND" }); // sealed

    await restoreCase(admin, c.id);
    // The old holder's claim slot is free, and anyone can now take the case and file.
    await claimCase(rescuer, c.id, "DEFENSE");
    await submitArgument(rescuer, c.id, "DEFENSE", DEFENSE_TEXT);
    row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("AWAITING_PROSECUTION");

    // Data left behind by the old bug (claimed status, no holder) is repaired / claimable.
    const legacy = await makeCase(accused);
    await db.case.update({ where: { id: legacy.id }, data: { status: "DEFENSE_CLAIMED", claimedById: null, claimExpiresAt: null } });
    await claimCase(holder, legacy.id, "DEFENSE");
    expect((await db.case.findUniqueOrThrow({ where: { id: legacy.id } })).claimedById).toBe(holder);
  });

  it("pauses a trial while it is under review or sealed, then resumes with the time left (audit 6 #1, #2)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("pause_admin", "ADMIN");
    const jurors = await makeUsers(10, "pz");
    const reporters = await makeUsers(3, "pzr");
    advance(hours(25)); // established reporters

    // Under review mid-deliberation: the deadline passes but no verdict is reached.
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, jurors, 8);
    advance(hours(20)); // 4h left
    for (const r of reporters) await fileReport(r, { caseId: c.id, target: "CASE", reason: "SPAM" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).moderationState).toBe("UNDER_REVIEW");
    advance(hours(30));
    await runMaintenanceNow();
    expect(await closeDeliberation(c.id)).toEqual({ kind: "not-due" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("DELIBERATION");
    expect((await stats(prosecutor)).prosecutionWins).toBe(0);
    await expect(adjournNow(admin, c.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
    // A stale tab voting now is told the trial is paused, not that it has closed (audit 26 #6).
    await expect(castVote(jurors[9], c.id, "GUILTY")).rejects.toMatchObject({ message: expect.stringMatching(/paused/) });

    await dismissReports(admin, c.id);
    let row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.deliberationPausedAt).toBeNull();
    advance(hours(3)); // 1h still left
    expect(await closeDeliberation(c.id)).toEqual({ kind: "not-due" });
    advance(hours(1) + 1);
    expect(await closeDeliberation(c.id)).toMatchObject({ kind: "closed", verdict: "GUILTY" });

    // Sealed mid-deliberation: no payouts, no notifications, even long past the deadline.
    const d = await makeCase(accused);
    await toDeliberation(d.id, attorney, prosecutor);
    await voteAll(d.id, jurors, 2);
    const before = await stats(attorney);
    await removeCase(admin, d.id, "Checking");
    advance(hours(48));
    await runMaintenanceNow();
    row = await db.case.findUniqueOrThrow({ where: { id: d.id } });
    expect(row.status).toBe("DELIBERATION");
    expect((await stats(attorney)).reputation).toBe(before.reputation);
    expect(await db.notification.count({ where: { userId: attorney, type: "VERDICT", href: { startsWith: `/cases/${d.number}-` } } })).toBe(0);
    await restoreCase(admin, d.id);
    expect(await closeDeliberation(d.id)).toEqual({ kind: "not-due" }); // full 24h remain
    advance(hours(24) + 1);
    expect(await closeDeliberation(d.id)).toMatchObject({ kind: "closed", verdict: "NOT_GUILTY" });
  });

  it("lets a player keep a locked item they already wear when saving their profile (audit 6 #4)", async () => {
    const player = await makeUser();
    const goose = { ...DEFAULT_AVATAR, species: "goose" as const };
    await db.user.update({ where: { id: player }, data: { avatar: goose } });
    await updateProfile(player, { displayName: "Goose Owner", bio: "Honk.", avatar: goose, profileTheme: "mahogany", featuredBadge: null });
    // …but can't switch *to* a locked item.
    await expect(
      updateProfile(player, { displayName: "Goose Owner", bio: "", avatar: { ...goose, headwear: "crown" }, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a ban removes the player's votes from open trials but leaves reached verdicts alone (audit 7 #6)", async () => {
    const [accused, attorney, prosecutor, rogue] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("vote_ban_admin", "ADMIN");
    process.env.COURT_QUORUM = "3";
    const others = await makeUsers(3, "vb");
    const closed = await makeCase(accused);
    await toDeliberation(closed.id, attorney, prosecutor);
    await castVote(rogue, closed.id, "GUILTY");
    await voteAll(closed.id, others, 3);
    await closeNow(closed.id);
    const open = await makeCase(accused);
    await toDeliberation(open.id, attorney, prosecutor);
    await castVote(rogue, open.id, "NOT_GUILTY");

    await setBan(admin, rogue, true, "Vote brigading");
    const o = await db.case.findUniqueOrThrow({ where: { id: open.id } });
    expect(o.notGuiltyVotes).toBe(0);
    expect(await db.vote.count({ where: { userId: rogue } })).toBe(1); // the closed trial's vote stands
    expect((await db.case.findUniqueOrThrow({ where: { id: closed.id } })).guiltyVotes).toBe(4);
    expect((await auditStats(rogue)).ok).toBe(true);
    // Unban: no second vote (or jury-vote XP) on the same trial (audit 9 #3, audit 44 #6).
    await setBan(admin, rogue, false);
    // Lifting contempt twice (or banning twice) is refused rather than logged again (audit 28 #6).
    await expect(setBan(admin, rogue, false)).rejects.toMatchObject({ code: "INVALID_STATE" });
    // …also when the requests arrive together (audit 30 D4): one ban, one log entry.
    const bans = await Promise.allSettled([setBan(admin, rogue, true, "A"), setBan(admin, rogue, true, "B"), setBan(admin, rogue, true, "C")]);
    expect(bans.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.moderationAction.count({ where: { action: "BAN_USER", targetUserId: rogue } })).toBe(2); // the earlier ban + this one
    await setBan(admin, rogue, false);
    // The struck vote isn't a second chance to vote the other way (audit 44 #6)…
    await expect(castVote(rogue, open.id, "GUILTY")).rejects.toMatchObject({ code: "ALREADY_DONE", message: expect.stringContaining("struck") });
    // …and the jury queue doesn't keep offering it (audit 55 D3).
    expect((await listJuryCases({ id: rogue, mutedCategories: [] })).cards.map((x) => x.id)).not.toContain(open.id);
    expect(await db.case.findUniqueOrThrow({ where: { id: open.id } })).toMatchObject({ guiltyVotes: 0, notGuiltyVotes: 0 });
    expect(await db.xpEvent.count({ where: { userId: rogue, caseId: open.id, reason: "jury-vote" } })).toBe(0); // refunded with the struck vote
    // …but other trials are open to them again.
    const later = await makeCase(accused);
    await toDeliberation(later.id, attorney, prosecutor);
    await castVote(rogue, later.id, "GUILTY");
    expect((await auditStats(rogue)).ok).toBe(true);
  });

  it("a ban takes back the player's reactions and open reports (audit 25 D8)", async () => {
    const [accused, attorney, prosecutor, rogue, fan, witness] = [await makeUser(), await makeUser(), await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("react_ban_admin", "ADMIN");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await toggleReaction(rogue, c.id, "LEGENDARY");
    await toggleReaction(rogue, c.id, "HILARIOUS");
    await toggleReaction(fan, c.id, "HILARIOUS");
    await fileReport(rogue, { caseId: c.id, target: "CASE", reason: "SPAM" });
    await fileReport(witness, { caseId: c.id, target: "CASE", reason: "SPAM" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).openReports).toBe(2);

    await setBan(admin, rogue, true, "Brigading");
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ legendaryCount: 0, hilariousCount: 1, reactionScore: 2, openReports: 1 });
    expect(await db.reaction.count({ where: { userId: rogue } })).toBe(0);
    expect(await db.report.findFirstOrThrow({ where: { reporterId: rogue } })).toMatchObject({ status: "DISMISSED" });
    expect(await db.report.findFirstOrThrow({ where: { reporterId: witness } })).toMatchObject({ status: "OPEN" });
  });

  it("deleting an account withdraws its open reports (audit 26 #8)", async () => {
    const [accused, quitter, witness] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await fileReport(quitter, { caseId: c.id, target: "CASE", reason: "SPAM" });
    await fileReport(witness, { caseId: c.id, target: "CASE", reason: "SPAM" });
    await deleteAccount(quitter, "objection!");
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).openReports).toBe(1);
    expect(await db.report.findFirstOrThrow({ where: { reporterId: quitter } })).toMatchObject({ status: "DISMISSED" });
  });

  it("a double-submitted argument is told it's already on file, and an adjourned-then-sealed trial says so on restore (audit 29 #3, #5)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("adj_seal_admin", "ADMIN");
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    await expect(submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ message: "Your defense is already on file." });
    await claimCase(prosecutor, c.id, "PROSECUTION");
    await submitArgument(prosecutor, c.id, "PROSECUTION", PROSECUTION_TEXT);
    // Adjourned, then sealed before the close ran.
    await db.case.update({ where: { id: c.id }, data: { deliberationEndsAt: new Date(clock.now().getTime() - 1000) } });
    await removeCase(admin, c.id, "Checking");
    await restoreCase(admin, c.id);
    const note = await db.notification.findFirstOrThrow({ where: { userId: attorney, title: { contains: "back in session" } } });
    expect(note.body).toMatch(/court rules on it now/);
    expect(note.body).not.toMatch(/adjourned/); // nobody adjourned it, and it may be below quorum (audit 62 D1)
  });

  it("a claim holder keeps their editor while the case is under review (audit 30 D3)", async () => {
    const [accused, attorney, holder, stranger] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    await claimCase(holder, c.id, "PROSECUTION");
    await db.case.update({ where: { id: c.id }, data: { moderationState: "UNDER_REVIEW" } });
    expect((await getCaseDetail(c.number, { id: holder, role: "PLAYER" }))?.kind).toBe("ok");
    expect((await getCaseDetail(c.number, { id: stranger, role: "PLAYER" }))?.kind).toBe("review");
    await submitArgument(holder, c.id, "PROSECUTION", PROSECUTION_TEXT);
  });

  it("two officers adjourning a below-quorum trial are both told it was extended (audit 35 D3)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const [modA, modB] = [await makeUser("adj_ext_a", "ADMIN"), await makeUser("adj_ext_b", "MODERATOR")];
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, await makeUsers(2, "ext"), 1); // quorum is 10
    // Both consoles show the same deadline; the second press must not act again (which would
    // extend and then dismiss the trial).
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    const seen = { endsAt: row.deliberationEndsAt!, extensionsUsed: row.extensionsUsed };
    const outcomes = await Promise.all([adjournNow(modA, c.id, seen), adjournNow(modB, c.id, seen)]);
    for (const o of outcomes) expect(o).toMatchObject({ kind: "extended" });
    expect(await db.moderationAction.count({ where: { action: "ADJOURN_NOW", caseId: c.id } })).toBe(1);
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("DELIBERATION");
  });

  it("officers recuse themselves from cases they're a party to (audit 35 notes)", async () => {
    const clerk = await makeUser("party_clerk", "MODERATOR");
    const other = await makeUser("other_clerk", "MODERATOR");
    const c = await makeCase(clerk);
    await expect(removeCase(clerk, c.id, "Hiding my own case")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(dismissReports(clerk, c.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await removeCase(other, c.id, "Another officer can");
  });

  it("an adjourn from a stale console does nothing and says so (audit 38 D2)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const [modA, modB] = [await makeUser("stale_a", "ADMIN"), await makeUser("stale_b", "MODERATOR")];
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    const seen = { endsAt: row.deliberationEndsAt!, extensionsUsed: row.extensionsUsed };
    // Officer B seals and restores while A's console is open: the deadline moves by the paused time.
    await removeCase(modB, c.id, "Checking");
    advance(minutes(5));
    await restoreCase(modB, c.id);
    expect(await adjournNow(modA, c.id, seen)).toEqual({ kind: "changed" });
    expect(await db.moderationAction.count({ where: { action: "ADJOURN_NOW", caseId: c.id } })).toBe(0);
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).extensionsUsed).toBe(0);
  });

  it("an officer arguing a trial can't ban its jurors to swing it (audit 39 #1)", async () => {
    const accused = await makeUser();
    const clerk = await makeUser("arguing_clerk", "MODERATOR");
    const otherAdmin = await makeUser("neutral_admin", "ADMIN");
    const [prosecutor, juror] = [await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await toDeliberation(c.id, clerk, prosecutor); // the clerk is the defense attorney
    await castVote(juror, c.id, "GUILTY");
    await expect(setBan(clerk, juror, true, "Swinging my own trial")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.vote.count({ where: { caseId: c.id, userId: juror } })).toBe(1);
    // Another officer, not party to it, can.
    await setBan(otherAdmin, juror, true, "Brigading");
    expect(await db.vote.count({ where: { caseId: c.id, userId: juror } })).toBe(0);
  });

  it("an officer who sat on the jury can't adjourn the trial or ban its other jurors (audit 40 D1)", async () => {
    const [accused, attorney, prosecutor, otherJuror] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const clerk = await makeUser("juror_clerk", "MODERATOR");
    const neutral = await makeUser("neutral_judge", "ADMIN");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await castVote(clerk, c.id, "GUILTY");
    await castVote(otherJuror, c.id, "NOT_GUILTY");
    await expect(adjournNow(clerk, c.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setBan(clerk, otherJuror, true, "Voted the wrong way")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.vote.count({ where: { caseId: c.id } })).toBe(2);
    await adjournNow(neutral, c.id); // a neutral officer can
  });

  it("a stale console neither dismisses unseen reports nor lifts a newer seal (audit 40 D2, D3)", async () => {
    const accused = await makeUser();
    const [a, b] = [await makeUser("stale_dismiss_a", "MODERATOR"), await makeUser("stale_dismiss_b", "ADMIN")];
    const [r1, r2] = [await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await fileReport(r1, { caseId: c.id, target: "CASE", reason: "SPAM" });
    const seen = (await db.report.findMany({ where: { caseId: c.id, status: "OPEN" }, select: { id: true } })).map((r) => r.id);
    await fileReport(r2, { caseId: c.id, target: "CASE", reason: "PERSONAL_INFO", details: "my real home address" });
    const res = await dismissReports(a, c.id, seen);
    expect(res.newer).toBe(1);
    expect(await db.report.findFirstOrThrow({ where: { reporterId: r2 } })).toMatchObject({ status: "OPEN" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).openReports).toBe(1);

    // Restore from a console that showed an older seal.
    await removeCase(b, c.id, "First look");
    const firstSeal = (await db.moderationAction.findFirstOrThrow({ where: { caseId: c.id, action: "REMOVE_CASE" } })).id;
    await restoreCase(b, c.id, firstSeal);
    await removeCase(b, c.id, "Second, more serious problem");
    await expect(restoreCase(a, c.id, firstSeal)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).moderationState).toBe("REMOVED");
  });

  it("an officer holding a claim on a case recuses from it (audit 41 D1)", async () => {
    const [accused, attorney, juror] = [await makeUser(), await makeUser(), await makeUser()];
    const clerk = await makeUser("claiming_clerk", "MODERATOR");
    const neutral = await makeUser("neutral_clerk", "MODERATOR");
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    await claimCase(clerk, c.id, "PROSECUTION");
    // The prosecutor-to-be can't strike the defense they're about to rebut, seal the case, or ban its attorney.
    await expect(strikeArgument(clerk, c.id, "DEFENSE")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeCase(clerk, c.id, "Inconvenient defense")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setBan(clerk, attorney, true, "Opposing counsel")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.argument.findFirstOrThrow({ where: { caseId: c.id, role: "DEFENSE" } })).toMatchObject({ stricken: false });
    expect((await db.user.findUniqueOrThrow({ where: { id: attorney } })).bannedAt).toBeNull();
    await setBan(neutral, juror, true, "Unrelated"); // a neutral officer is unaffected
    await strikeArgument(neutral, c.id, "DEFENSE");
  });

  it("striking the reported argument puts an under-review case back on view and resumes its trial (audit 41 D4)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const mod = await makeUser("strike_review_clerk", "MODERATOR");
    const reporters = await makeUsers(3, "srv");
    advance(hours(25)); // established accounts
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    for (const r of reporters) await fileReport(r, { caseId: c.id, target: "DEFENSE", reason: "HARASSMENT" });
    expect(await db.case.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ moderationState: "UNDER_REVIEW", openReports: 3 });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).deliberationPausedAt).not.toBeNull();
    expect(await strikeArgument(mod, c.id, "DEFENSE")).toEqual({ madeVisible: true, stillUnderReview: false });
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ moderationState: "VISIBLE", openReports: 0, deliberationPausedAt: null });
    expect(await db.notification.count({ where: { userId: accused, title: { contains: "back in session" } } })).toBe(1);

    // With a report on the confession still open, it stays under review.
    const c2 = await makeCase(accused);
    await toDeliberation(c2.id, attorney, prosecutor);
    await fileReport(reporters[0], { caseId: c2.id, target: "CASE", reason: "SPAM" });
    for (const r of reporters.slice(1)) await fileReport(r, { caseId: c2.id, target: "DEFENSE", reason: "SPAM" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c2.id } })).moderationState).toBe("UNDER_REVIEW");
    expect(await strikeArgument(mod, c2.id, "DEFENSE")).toEqual({ madeVisible: false, stillUnderReview: true });
    expect(await db.case.findUniqueOrThrow({ where: { id: c2.id } })).toMatchObject({ moderationState: "UNDER_REVIEW", openReports: 1 });
  });

  it("reasons with emoji at the length cut-off are stored, never half a character (audit 41 D2)", async () => {
    const accused = await makeUser();
    const mod = await makeUser("emoji_clerk", "ADMIN");
    const victim = await makeUser();
    const c = await makeCase(accused);
    const reason = `${"x".repeat(199)}\u{1F64F} thanks`;
    await removeCase(mod, c.id, reason);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.moderationState).toBe("REMOVED");
    const note = (await db.notification.findFirstOrThrow({ where: { userId: accused, title: { contains: "was sealed" } } })).body;
    expect(note).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/); // no lone high surrogate
    const emojiBan = "\u{1F64F}".repeat(200);
    await setBan(mod, victim, true, emojiBan);
    const banned = await db.user.findUniqueOrThrow({ where: { id: victim } });
    expect(banned.banReason!.length).toBeLessThanOrEqual(300);
    expect(banned.banReason!.length % 2).toBe(0); // whole emoji only
    const logged = await db.moderationAction.findFirstOrThrow({ where: { targetUserId: victim, action: { contains: "BAN" } } });
    expect(logged.note!.endsWith("…")).toBe(true);
  });

  it("a repeat report is answered as already reported, not as rate-limited (audit 41 D5)", async () => {
    const accused = await makeUser();
    const reporter = await makeUser();
    const c = await makeCase(accused);
    await assertNotYetReported(reporter, c.id, "CASE");
    await fileReport(reporter, { caseId: c.id, target: "CASE", reason: "SPAM" });
    await expect(assertNotYetReported(reporter, c.id, "CASE")).rejects.toMatchObject({ code: "ALREADY_DONE", message: expect.stringContaining("already reported") });
    await assertNotYetReported(reporter, c.id, "DEFENSE");
  });

  it("a new account's report can't keep a reviewed case hidden; an established one's can (audit 42 D5)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const mod = await makeUser("review_clerk", "MODERATOR");
    const reporters = await makeUsers(4, "estab");
    advance(hours(25)); // established accounts
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    for (const r of reporters.slice(0, 3)) await fileReport(r, { caseId: c.id, target: "CASE", reason: "SPAM" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).moderationState).toBe("UNDER_REVIEW");
    const seen = (await db.report.findMany({ where: { caseId: c.id, status: "OPEN" }, select: { id: true } })).map((r) => r.id);
    const throwaway = await makeUser(); // signed up a minute ago
    await fileReport(throwaway, { caseId: c.id, target: "CASE", reason: "HARASSMENT" });
    const res = await dismissReports(mod, c.id, seen);
    expect(res).toMatchObject({ madeVisible: true, newer: 1, stillUnderReview: false });
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ moderationState: "VISIBLE", openReports: 1, deliberationPausedAt: null });
    expect(await db.report.findFirstOrThrow({ where: { reporterId: throwaway } })).toMatchObject({ status: "OPEN" }); // still in the queue

    // A newer report from an established account does keep it under review.
    const c2 = await makeCase(accused);
    for (const r of reporters.slice(0, 3)) await fileReport(r, { caseId: c2.id, target: "CASE", reason: "SPAM" });
    const seen2 = (await db.report.findMany({ where: { caseId: c2.id, status: "OPEN" }, select: { id: true } })).map((r) => r.id);
    await fileReport(reporters[3], { caseId: c2.id, target: "CASE", reason: "PERSONAL_INFO", details: "my real address" });
    expect(await dismissReports(mod, c2.id, seen2)).toMatchObject({ madeVisible: false, newer: 1, stillUnderReview: true });
    expect((await db.case.findUniqueOrThrow({ where: { id: c2.id } })).moderationState).toBe("UNDER_REVIEW");
  });

  it("claims the court ends (a seal, a ban) don't use up the player's claims on that case (audit 43 #1)", async () => {
    const accused = await makeUser();
    const player = await makeUser();
    const admin = await makeUser("void_judge", "ADMIN");
    const c = await makeCase(accused);
    for (let round = 0; round < 3; round++) {
      await claimCase(player, c.id, "DEFENSE");
      await removeCase(admin, c.id, "Checking something");
      await restoreCase(admin, c.id);
    }
    await claimCase(player, c.id, "DEFENSE"); // still allowed: none of those were the player's doing
    await setBan(admin, player, true, "Test");
    await setBan(admin, player, false);
    await claimCase(player, c.id, "DEFENSE");
    expect(await db.caseClaim.count({ where: { caseId: c.id, outcome: "VOIDED" } })).toBe(4);
    await submitArgument(player, c.id, "DEFENSE", DEFENSE_TEXT);
  });

  it("an officer who acted on a case can't then argue it or judge it; promotions keep officer names unique (audit 48)", async () => {
    const [accused, attorney, juror] = [await makeUser(), await makeUser(), await makeUser()];
    const clerk = await makeUser("acting_clerk", "MODERATOR");
    const admin = await makeUser("acting_judge", "ADMIN");
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    // D1: strike the defense, then try to prosecute it.
    await strikeArgument(clerk, c.id, "DEFENSE");
    await expect(claimCase(clerk, c.id, "PROSECUTION")).rejects.toMatchObject({ code: "INELIGIBLE", message: expect.stringContaining("acted on this case") });
    await strikeArgument(clerk, c.id, "DEFENSE", false);
    const prosecutor = await makeUser();
    await claimCase(prosecutor, c.id, "PROSECUTION");
    await submitArgument(prosecutor, c.id, "PROSECUTION", PROSECUTION_TEXT);
    await expect(castVote(clerk, c.id, "GUILTY")).rejects.toMatchObject({ code: "INELIGIBLE" });
    await castVote(juror, c.id, "GUILTY"); // others are unaffected

    // D4: a pointless "unban" doesn't reveal who shares an open trial with the officer.
    const clerk2 = await makeUser("juror_clerk_two", "MODERATOR");
    await castVote(clerk2, c.id, "NOT_GUILTY");
    await expect(setBan(clerk2, juror, false)).rejects.toMatchObject({ code: "INVALID_STATE", message: expect.stringContaining("isn't held in contempt") });

    // D2: a player whose name others already use can't be appointed until it's distinctive.
    const harrietA = await makeUser("harriet_a");
    const harrietB = await makeUser("harriet_b");
    await db.user.update({ where: { id: harrietA }, data: { displayName: "Honest Harriet" } });
    await db.user.update({ where: { id: harrietB }, data: { displayName: "Honest Harriet" } });
    await expect(setUserRole(admin, harrietA, "MODERATOR")).rejects.toMatchObject({ code: "CONFLICT" });
    await db.user.update({ where: { id: harrietA }, data: { displayName: "Clerk Quillsworth" } });
    await setUserRole(admin, harrietA, "MODERATOR");

    // D5: counsel whose claim a ban released is told why.
    const banned = await makeUser();
    const counsel = await makeUser();
    const held = await makeCase(banned);
    await claimCase(counsel, held.id, "DEFENSE");
    await setBan(admin, banned, true, "Contempt");
    await expect(submitArgument(counsel, held.id, "DEFENSE", DEFENSE_TEXT)).rejects.toMatchObject({ message: expect.stringContaining("released your claim") });
  });

  it("banning a claim holder recuses the officer from that case; recused cases aren't offered; bios can't speak for the court (audit 49)", async () => {
    const [accused, holder, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const clerk = await makeUser("banning_clerk", "MODERATOR");
    const c = await makeCase(accused);
    await claimCase(holder, c.id, "DEFENSE");
    // D1: ban the holder, then try to take the case yourself.
    await setBan(clerk, holder, true, "Contempt");
    expect(await db.moderationAction.count({ where: { action: "VOID_CLAIM", caseId: c.id, moderatorId: clerk } })).toBe(1);
    await expect(claimCase(clerk, c.id, "DEFENSE")).rejects.toMatchObject({ code: "INELIGIBLE" });
    expect((await pickRandomQueueCase("DEFENSE", { id: clerk, mutedCategories: [] }))?.id).not.toBe(c.id);
    // …and the docket says so up front instead of offering an enabled button (audit 53 #2).
    expect((await listQueue({ role: "DEFENSE", viewer: { id: clerk, mutedCategories: [] } })).cards.find((x) => x.id === c.id)?.eligibility).toMatchObject({ ok: false, reason: expect.stringContaining("acted on this case") });
    // D4: a trial the officer acted on isn't in their jury queue.
    await toDeliberation(c.id, attorney, prosecutor);
    expect((await listJuryCases({ id: clerk, mutedCategories: [] })).cards.map((x) => x.id)).not.toContain(c.id);
    expect((await listJuryCases({ id: await makeUser(), mutedCategories: [] })).cards.map((x) => x.id)).toContain(c.id);
    // D3: a player's bio can't claim to be staff; ordinary bios are fine.
    const player = await makeUser();
    await expect(
      updateProfile(player, { displayName: "Plain Pat", bio: "Official court moderator here. Appeal your ban by messaging me.", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION", field: "bio" });
    await updateProfile(player, { displayName: "Plain Pat", bio: "Everything in moderation, except pizza.", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
    // A bio can't speak for a named officer (audit 55 D2), though it may mention one.
    const quill = await makeUser("quill_clerk", "MODERATOR");
    await db.user.update({ where: { id: quill }, data: { displayName: "Clerk Quillsworth" } });
    await expect(
      updateProfile(player, { displayName: "Plain Pat", bio: "Clerk Quillsworth's alt. Report problems to me.", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION", field: "bio" });
    for (const claim of ["I work closely with Clerk Quillsworth on every ban.", "Quillsworth trusts me with the gavel."]) {
      await expect(
        updateProfile(player, { displayName: "Plain Pat", bio: claim, avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION", field: "bio" });
    }
    await updateProfile(player, { displayName: "Plain Pat", bio: "Quillsworth sealed my best case and I'm still sulking.", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
  });

  it("an appointment racing a profile save never leaves two people with the new officer's name (audit 51 #1)", async () => {
    const admin = await makeUser("race_judge", "ADMIN");
    for (let i = 0; i < 6; i++) {
      // Distinct words per round: an appointed officer's username reserves its words too.
      const word = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"][i];
      const [a, b] = [await makeUser(`${word}_one`), await makeUser(`${word}_two`)];
      const name = `${word[0].toUpperCase()}${word.slice(1)}ella ${word[0].toUpperCase()}${word.slice(1)}worth`;
      await db.user.update({ where: { id: a }, data: { displayName: name } });
      await Promise.allSettled([
        setUserRole(admin, a, "MODERATOR"),
        updateProfile(b, { displayName: name, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ]);
      const [ua, ub] = [await db.user.findUniqueOrThrow({ where: { id: a } }), await db.user.findUniqueOrThrow({ where: { id: b } })];
      // Exactly one of them happened: the appointment, or the second player taking the name.
      expect(ua.role === "MODERATOR" && ub.displayName === name).toBe(false);
      expect(ua.role === "MODERATOR" || ub.displayName === name).toBe(true);
    }
    // A demoted officer's stand-in name doesn't block re-appointing them because of other "Citizen"s (audit 51 #4).
    const clerk = await makeUser("citizen_clerk", "MODERATOR");
    await db.user.update({ where: { id: clerk }, data: { displayName: "Clerk Citizen" } });
    await setUserRole(admin, clerk, "PLAYER");
    const other = await makeUser("other_citizen");
    await db.user.update({ where: { id: other }, data: { displayName: "Model Citizen" } });
    await db.user.update({ where: { id: clerk }, data: { displayName: "Citizen 6944" } });
    await setUserRole(admin, clerk, "MODERATOR");
  });

  it("revealing an anonymous confessor is logged and recuses the officer; nobody poses as the site (audit 57 #1, #2)", async () => {
    const accused = await makeUser();
    const clerk = await makeUser("reveal_clerk", "MODERATOR");
    const c = await makeCase(accused, { anonymous: true });
    expect(await revealConfessor(clerk, c.id)).toBe((await db.user.findUniqueOrThrow({ where: { id: accused } })).username);
    expect(await db.moderationAction.count({ where: { action: "REVEAL_CONFESSOR", caseId: c.id, moderatorId: clerk } })).toBe(1);
    await expect(claimCase(clerk, c.id, "DEFENSE")).rejects.toMatchObject({ code: "INELIGIBLE" });
    const plain = await makeCase(accused);
    await expect(revealConfessor(clerk, plain.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
    // Officers (and the judge) can't take the site's or the system's names.
    const judge = await makeUser("site_judge", "ADMIN");
    for (const [who, name] of [[clerk, "Court of the Internet"], [clerk, "Verified \u2713"], [judge, "System"], [judge, "Deleted User"]] as const) {
      await expect(updateProfile(who, { displayName: name, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null })).rejects.toMatchObject({ code: "VALIDATION" });
    }
    await expect(
      updateProfile(clerk, { displayName: "Clerk Revealer", bio: "Admin of this site, I can unban you.", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION", field: "bio" });
  });

  it("a refused ban never confirms who filed an anonymous case (audit 59 D1)", async () => {
    const confessor = await makeUser();
    const clerk = await makeUser("anon_probe_clerk", "MODERATOR");
    const c = await makeCase(confessor, { anonymous: true });
    await claimCase(clerk, c.id, "DEFENSE");
    // The only other party to the clerk's open trial is its anonymous confessor: the ban must not
    // be refused on that ground (it would unmask them, with nothing in the audit log).
    await setBan(clerk, confessor, true, "Probe");
    expect((await db.user.findUniqueOrThrow({ where: { id: confessor } })).bannedAt).not.toBeNull();
  });

  it("players can't pose as an officer of the court (audit 9 #8)", async () => {
    await makeUser("real_judge", "ADMIN");
    await db.user.update({ where: { username: "real_judge" }, data: { displayName: "Judge Realname" } });
    const player = await makeUser();
    await expect(
      updateProfile(player, { displayName: "judge realname", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    for (const sneaky of ["Judge Realname Jr", "The Real Judge Realname", "Former Citizen", "Judge Realname.", "Judge\u200bRealname", "JUDGE  REALNAME", "Judge Réalname", "Judge Rea1name", "Judge Rеalname" /* Cyrillic е */]) {
      await expect(
        updateProfile(player, { displayName: sneaky, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    }
    // Multi-letter look-alikes: "vv" for "w", "rn" for "m" (audit 15 #4).
    await makeUser("real_marshal", "MODERATOR");
    await db.user.update({ where: { username: "real_marshal" }, data: { displayName: "Marshal Wigsworth Mumford" } });
    for (const sneaky of ["Marshal Wigsvvorth Mumford", "Marshal Wigsworth Murnford", "Marshal Wiggsworth Mumford", "Marshal Wigsworth Mumfrd"]) {
      await expect(
        updateProfile(player, { displayName: sneaky, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    }
    // The officer's distinctive name word alone, with another title, or one typo away (audit 27 #5).
    for (const sneaky of ["Realname", "Your Honour Realname", "Judgee Reallname", "Mumford", "Sir Mumfort"]) {
      await expect(
        updateProfile(player, { displayName: sneaky, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    }
    for (const fine of ["Judge Mental", "Marshal Law", "Wordsworth Fan"]) {
      await updateProfile(player, { displayName: fine, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
    }
    // Another officer can't take it either (audit 43 #2), but an officer can keep (or re-save) their own.
    const marshal = (await db.user.findUniqueOrThrow({ where: { username: "real_marshal" } })).id;
    await expect(
      updateProfile(marshal, { displayName: "Judge Realname", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await updateProfile(marshal, { displayName: "Marshal Wigsworth Mumford", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
    // Staff titles anywhere in a player's name (audit 44 #1); an officer keeps theirs.
    for (const titled of ["Head Moderator", "Bob (Moderator)", "Clerk of the Court"]) {
      await expect(
        updateProfile(player, { displayName: titled, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION", field: "displayName" });
    }
    await updateProfile(marshal, { displayName: "Marshal Wigsworth Mumford, Court Clerk", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
    // Usernames can't pose as an officer either (audit 45 D1).
    await expect(registerUser({ username: "court_moderator", displayName: "Bob", password: "objection-sustained" })).rejects.toMatchObject({ field: "username" });
    for (const u of ["real_judge_", "realjudge", "real_marshal2", "judge realname"]) {
      await expect(assertNotStaffName(u.replace(/_/g, " "), undefined, "username")).rejects.toMatchObject({ code: "VALIDATION", field: "username" });
    }
    await assertNotStaffName("pizza fan", undefined, "username");
  });

  it("a ban racing a trial's close never splits the verdict from its tally (audit 10 #2)", async () => {
    const [accused, attorney, prosecutor, juror] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("race_ban_admin", "ADMIN");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await castVote(juror, c.id, "GUILTY");

    // A close in progress: it holds the case row while it tallies, then commits CLOSED.
    const closing = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${c.id} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_sleep(0.5)`;
      // Like the real close, it writes rows that reference the juror (a verdict notification),
      // which takes a key-share lock on their User row while the ban is waiting for this case
      // row. The ban must not hold a lock that conflicts with that (audit 32 D1: deadlock).
      await tx.notification.create({ data: { userId: juror, type: "VERDICT", title: "The verdict is in", body: "Guilty." } });
      await tx.case.update({ where: { id: c.id }, data: { status: "CLOSED", verdict: "GUILTY", closedAt: new Date() } });
    });
    await new Promise((r) => setTimeout(r, 120));
    await Promise.all([closing, setBan(admin, juror, true, "Racing the gavel")]);

    // The close won: the vote it counted stays, and the stored tally still matches the rows.
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(await db.vote.count({ where: { caseId: c.id } })).toBe(1);
    expect(row.guiltyVotes).toBe(1);
    expect((await stats(juror)).juryVotes).toBe(1); // (the simulated close pays no majority bonus, so no full audit here)
  });

  it("striking an argument updates the queue's open-report count (audit 11 #8)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const mod = await makeUser("strike_clerk", "MODERATOR");
    const reporters = await makeUsers(2, "strk");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await fileReport(reporters[0], { caseId: c.id, target: "DEFENSE", reason: "SPAM" });
    await fileReport(reporters[1], { caseId: c.id, target: "CASE", reason: "SPAM" });
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).openReports).toBe(2);
    await strikeArgument(mod, c.id, "DEFENSE");
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).openReports).toBe(1); // only the CASE report is still open
  });

  it("simultaneous reports keep an exact reporter count (audit 12 D4)", async () => {
    const accused = await makeUser();
    const reporters = await makeUsers(5, "simrep");
    advance(hours(25));
    const c = await makeCase(accused);
    await Promise.all(reporters.map((r) => fileReport(r, { caseId: c.id, target: "CASE", reason: "SPAM" })));
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.openReports).toBe(5);
    expect(row.moderationState).toBe("UNDER_REVIEW");
  });

  it("respects the featuring opt-out, even for a case already pinned today (audit 13 #3)", async () => {
    process.env.COURT_QUORUM = "3";
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const mod = await makeUser("feature_clerk", "MODERATOR");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, await makeUsers(3, "feat"), 2);
    await closeNow(c.id);
    await pinFeaturedCase(mod, c.id, utcDay());
    expect(await getFeaturedCase(null)).toMatchObject({ id: c.id, pinned: true });
    await toggleReaction(await makeUser(), c.id, "LEGENDARY");
    expect((await getHighlights()).legendary?.id).toBe(c.id);
    expect((await getLeaderboards()).entertaining.map((x) => x.id)).toContain(c.id);
    await db.user.update({ where: { id: accused }, data: { allowFeaturing: false } });
    expect((await getFeaturedCase(null))?.id).not.toBe(c.id);
    await expect(pinFeaturedCase(mod, c.id, utcDay())).rejects.toMatchObject({ code: "INELIGIBLE" });
    // The opt-out covers the highlights and the "Most entertaining" board too (audit 44 #4).
    expect((await getHighlights()).legendary?.id).not.toBe(c.id);
    expect((await getHighlights()).closest?.id).not.toBe(c.id);
    expect((await getLeaderboards()).entertaining.map((x) => x.id)).not.toContain(c.id);
    // …and so does a ban of a public confessor; an automatic pick isn't called hand-picked.
    await db.user.update({ where: { id: accused }, data: { allowFeaturing: true } });
    const admin = await makeUser("feature_admin", "ADMIN");
    await setBan(admin, accused, true, "Contempt");
    expect((await getHighlights()).legendary?.id).not.toBe(c.id);
    const auto = await getFeaturedCase(null);
    if (auto) expect(auto.pinned).toBe(false);
  });

  it("an anonymous case keeps the featuring choice it was filed with, so toggling can't link it (audit 46 D3)", async () => {
    process.env.COURT_QUORUM = "3";
    const [accused, attorney, prosecutor, fan] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const closeOne = async (anonymous: boolean) => {
      const c = await makeCase(accused, { anonymous });
      await toDeliberation(c.id, attorney, prosecutor);
      await voteAll(c.id, await makeUsers(3, anonymous ? "anv" : "pub"), 2);
      await closeNow(c.id);
      await toggleReaction(fan, c.id, "HILARIOUS");
      return c.id;
    };
    const anon = await closeOne(true);
    const pub = await closeOne(false);
    const board = async () => (await getLeaderboards()).entertaining.map((x) => x.id);
    expect(await board()).toEqual(expect.arrayContaining([anon, pub]));
    await db.user.update({ where: { id: accused }, data: { allowFeaturing: false } });
    // The public case leaves; the anonymous one stays put (it moved together with it before).
    expect(await board()).toContain(anon);
    expect(await board()).not.toContain(pub);
    // A case filed anonymously while opted out stays out, whatever the setting later says.
    const later = await closeOne(true);
    await db.user.update({ where: { id: accused }, data: { allowFeaturing: true } });
    expect(await board()).not.toContain(later);
    expect(await board()).toContain(pub);
  });

  it("two officers pinning different cases at once: one pins, the other is told (audit 37 D5)", async () => {
    process.env.COURT_QUORUM = "3";
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const [modA, modB] = [await makeUser("pin_a", "MODERATOR"), await makeUser("pin_b", "ADMIN")];
    const cases = [await makeCase(accused), await makeCase(accused)];
    for (const c of cases) {
      await toDeliberation(c.id, attorney, prosecutor);
      await voteAll(c.id, await makeUsers(3, `pin${c.id.slice(-4)}`), 2);
      await closeNow(c.id);
    }
    // Both consoles showed no featured case yet.
    const results = await Promise.allSettled([pinFeaturedCase(modA, cases[0].id, utcDay(), ""), pinFeaturedCase(modB, cases[1].id, utcDay(), "")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    expect(await db.moderationAction.count({ where: { action: "PIN_FEATURED" } })).toBe(1);
  });

  it("banned players earn nothing new and their open cases are on hold (audit 14 #6)", async () => {
    process.env.COURT_QUORUM = "3";
    const [accused, attorney, prosecutor, lawyer] = [await makeUser(), await makeUser(), await makeUser(), await makeUser()];
    const admin = await makeUser("payout_admin", "ADMIN");
    const c = await makeCase(accused);
    await toDeliberation(c.id, attorney, prosecutor);
    await voteAll(c.id, await makeUsers(3, "pay"), 3);
    await setBan(admin, prosecutor, true, "Contempt");
    const before = await stats(prosecutor);
    const badgesBefore = await achievementKeys(prosecutor);
    await closeNow(c.id);
    const after = await stats(prosecutor);
    expect(after.prosecutionWins).toBe(before.prosecutionWins + 1); // the record stands…
    expect(after.xp).toBe(before.xp); // …but no XP is paid
    expect((await auditStats(prosecutor)).ok).toBe(true);
    // …nor achievements (a first win normally earns one), audit 43 note.
    expect(await achievementKeys(prosecutor)).toEqual(badgesBefore);

    const open = await makeCase(accused);
    const anon = await makeCase(accused, { anonymous: true });
    const held = await makeCase(accused);
    const counsel = await makeUser();
    await claimCase(counsel, held.id, "DEFENSE");
    const awaitingBefore = (await getCommunityStats()).awaiting;
    await setBan(admin, accused, true, "Contempt");
    // The held case no longer counts as awaiting counsel on the home page (audit 27 #8).
    expect((await getCommunityStats()).awaiting).toBe(awaitingBefore - 1);
    // A claim already held on a public case of theirs is released, so it can't be filed and moved along (audit 46 D7).
    expect(await db.case.findUniqueOrThrow({ where: { id: held.id } })).toMatchObject({ status: "AWAITING_DEFENSE", claimedById: null });
    expect(await db.caseClaim.findFirstOrThrow({ where: { caseId: held.id, userId: counsel } })).toMatchObject({ outcome: "VOIDED" });
    await expect(submitArgument(counsel, held.id, "DEFENSE", DEFENSE_TEXT)).rejects.toBeTruthy();
    expect(await db.notification.count({ where: { userId: counsel, title: { contains: "was released" } } })).toBe(1);
    await expect(claimCase(lawyer, open.id, "DEFENSE")).rejects.toMatchObject({ code: "INVALID_STATE" });
    // …except anonymous ones: holding them would reveal who confessed (audit 15 #2).
    expect((await listQueue({ role: "DEFENSE", viewer: null })).cards.map((x) => x.id)).toContain(anon.id);
    await claimCase(lawyer, anon.id, "DEFENSE");
  });

  it("a seal racing the holder's filing never sends a filed case back to the docket (audit 15 #1)", async () => {
    const [accused, attorney] = [await makeUser(), await makeUser()];
    const admin = await makeUser("seal_race_admin", "ADMIN");
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");

    // The filing is mid-commit: the case row already says "defense filed" in an open transaction.
    const filing = db.$transaction(async (tx) => {
      await tx.case.update({ where: { id: c.id }, data: { status: "AWAITING_PROSECUTION", attorneyId: attorney, claimedById: null, claimExpiresAt: null } });
      await tx.argument.create({ data: { caseId: c.id, authorId: attorney, role: "DEFENSE", body: DEFENSE_TEXT, createdAt: new Date() } });
      await tx.$executeRaw`SELECT pg_sleep(0.5)`;
    });
    await new Promise((r) => setTimeout(r, 120));
    await Promise.all([filing, removeCase(admin, c.id, "Checking")]);

    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: "AWAITING_PROSECUTION", attorneyId: attorney, moderationState: "REMOVED" });
    await restoreCase(admin, c.id);
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("AWAITING_PROSECUTION");
  });

  it("a ban racing the player's own in-flight votes and claims always wins (audit 17 #1)", async () => {
    const [attorney, prosecutor] = [await makeUser(), await makeUser()];
    const admin = await makeUser("inflight_admin", "ADMIN");
    for (let round = 0; round < 6; round++) {
      const rogue = await makeUser();
      const trials = [];
      for (let i = 0; i < 3; i++) {
        const t = await makeCase(await makeUser()); // fresh accused: stay under the daily cap
        await toDeliberation(t.id, attorney, prosecutor);
        trials.push(t);
      }
      const open = await makeCase(await makeUser());
      await Promise.allSettled([
        ...trials.map((t) => castVote(rogue, t.id, "GUILTY")),
        claimCase(rogue, open.id, "DEFENSE"),
        setBan(admin, rogue, true, "Brigading"),
      ]);
      // Whatever the interleaving, a banned player has no votes in open trials and holds no claims.
      expect(await db.vote.count({ where: { userId: rogue, case: { status: "DELIBERATION" } } })).toBe(0);
      expect(await db.case.count({ where: { claimedById: rogue } })).toBe(0);
      for (const t of trials) {
        const row = await db.case.findUniqueOrThrow({ where: { id: t.id } });
        expect(row.guiltyVotes + row.notGuiltyVotes).toBe(await db.vote.count({ where: { caseId: t.id } }));
      }
    }
  });

  it("a seal racing 'dismiss reports' always ends sealed (audit 18 #1)", async () => {
    const [modA, modB] = [await makeUser("race_mod_a", "MODERATOR"), await makeUser("race_mod_b", "MODERATOR")];
    for (let i = 0; i < 12; i++) {
      const c = await makeCase(await makeUser());
      await db.case.update({ where: { id: c.id }, data: { moderationState: "UNDER_REVIEW" } });
      await Promise.allSettled([removeCase(modA, c.id, "doxxing removed"), dismissReports(modB, c.id)]);
      expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).moderationState).toBe("REMOVED");
    }
  });

  it("a prosecution filed while reports put the case under review starts paused (audit 21 #1)", async () => {
    const [accused, attorney, prosecutor] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(attorney, c.id, "DEFENSE");
    await submitArgument(attorney, c.id, "DEFENSE", DEFENSE_TEXT);
    await claimCase(prosecutor, c.id, "PROSECUTION");

    // The third established report is mid-commit: it holds the case row and has flipped it to UNDER_REVIEW.
    const reporting = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${c.id} FOR UPDATE`;
      await tx.case.update({ where: { id: c.id }, data: { moderationState: "UNDER_REVIEW" } });
      await tx.$executeRaw`SELECT pg_sleep(0.5)`;
    });
    await new Promise((r) => setTimeout(r, 120));
    await Promise.all([reporting, submitArgument(prosecutor, c.id, "PROSECUTION", PROSECUTION_TEXT)]);

    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: "DELIBERATION", moderationState: "UNDER_REVIEW" });
    expect(row.deliberationPausedAt).not.toBeNull(); // the clock is stopped while voting is
  });

  it("deleting an account releases its claims; moderators can't ban other officers", async () => {
    const [accused, quitter, next] = [await makeUser(), await makeUser(), await makeUser()];
    const c = await makeCase(accused);
    await claimCase(quitter, c.id, "DEFENSE");
    await deleteAccount(quitter, "objection!");
    expect(await db.case.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "AWAITING_DEFENSE", claimedById: null });
    await claimCase(next, c.id, "DEFENSE");
    // The deleted username can't be taken over by someone else (audit 8 #6).
    const oldName = (await db.user.findUniqueOrThrow({ where: { id: quitter } })).username;
    await expect(makeUser(oldName)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(authenticate(oldName, "objection!")).rejects.toBeTruthy();

    const [modA, modB] = [await makeUser("mod_a", "MODERATOR"), await makeUser("mod_b", "MODERATOR")];
    const admin = await makeUser("ban_admin", "ADMIN");
    await expect(setBan(modA, modB, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setBan(modA, admin, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setBan(admin, modB, true); // admins still can
    await setBan(modA, accused, true); // and moderators can ban players
  });

  it("only lets admins grant cosmetics, which then unlock items", async () => {
    const player = await makeUser();
    const admin = await makeUser("boss", "ADMIN");
    await expect(
      updateProfile(player, { displayName: "P", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "velvet-rope", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(grantEntitlement(player, player, "theme:velvet-rope")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await grantEntitlement(admin, player, "theme:velvet-rope");
    // …but not to themselves (audit 58 D5).
    await expect(grantEntitlement(admin, admin, "theme:gilded")).rejects.toMatchObject({ code: "FORBIDDEN" });
    // A repeat grant is refused (no second gift notice or log entry), also when two arrive together (audit 35 D2).
    await expect(grantEntitlement(admin, player, "theme:velvet-rope")).rejects.toMatchObject({ code: "INVALID_STATE" });
    const both = await Promise.allSettled([grantEntitlement(admin, player, "theme:gilded"), grantEntitlement(admin, player, "theme:gilded")]);
    expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(both.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "INVALID_STATE" } });
    expect(await db.moderationAction.count({ where: { action: "GRANT_COSMETIC", targetUserId: player } })).toBe(2);
    // Role changes refuse no-ops (audit 35 D4).
    await expect(setUserRole(admin, player, "PLAYER")).rejects.toMatchObject({ code: "INVALID_STATE" });
    // …also two arriving at once: one acts and logs (audit 38 D5).
    const promos = await Promise.allSettled([setUserRole(admin, player, "MODERATOR"), setUserRole(admin, player, "MODERATOR")]);
    expect(promos.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.moderationAction.count({ where: { action: "SET_ROLE_MODERATOR", targetUserId: player } })).toBe(1);
    // As an officer they may take a titled name; demoted, they don't keep it (audit 45 D2).
    // …though not the presiding judge's titles (audit 47 D2).
    for (const judgely of ["Presiding Judge", "Chief Justice Pemberton", "The Judge"]) {
      await expect(updateProfile(player, { displayName: judgely, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "velvet-rope", featuredBadge: null })).rejects.toMatchObject({ code: "VALIDATION" });
    }
    await updateProfile(player, { displayName: "Head Clerk Moderator", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "velvet-rope", featuredBadge: null });
    await setUserRole(admin, player, "PLAYER");
    const demoted = await db.user.findUniqueOrThrow({ where: { id: player } });
    expect(demoted.displayName).toBe(demoted.username);
    // A titled save racing the demotion never leaves a player wearing the title (audit 47 D1).
    for (let i = 0; i < 6; i++) {
      const racer = await makeUser(`racer_${i}`, "MODERATOR");
      await Promise.allSettled([
        updateProfile(racer, { displayName: "Moderator Jay", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
        setUserRole(admin, racer, "PLAYER"),
      ]);
      const after = await db.user.findUniqueOrThrow({ where: { id: racer } });
      expect(after.role).toBe("PLAYER");
      expect(after.displayName).not.toBe("Moderator Jay");
    }
    // …and when the username carries a title too, a neutral stand-in, with a titled bio cleared (audit 46 D2).
    const clerkish = await makeUser("clerk_tester", "MODERATOR");
    await db.user.update({ where: { id: clerkish }, data: { displayName: "Clerk Tester", bio: "Head clerk of the docket" } });
    await setUserRole(admin, clerkish, "PLAYER");
    const plain = await db.user.findUniqueOrThrow({ where: { id: clerkish } });
    expect(plain.displayName).toMatch(/^Citizen \d{4}$/);
    expect(plain.bio).toBe("");
    expect(await db.notification.count({ where: { userId: player, title: { contains: "no longer a court clerk" } } })).toBe(1);
    // A huge reason is capped in the audit log too (audit 38 D4).
    const target = await makeUser();
    await setBan(admin, target, true, "x".repeat(100_000));
    expect((await db.moderationAction.findFirstOrThrow({ where: { action: "BAN_USER", targetUserId: target } })).note!.length).toBeLessThanOrEqual(300);
    // Two simultaneous account deletions: one deletes, the other is told (audit 38 note).
    const quitter = await makeUser();
    const dels = await Promise.allSettled([deleteAccount(quitter, "objection!"), deleteAccount(quitter, "objection!")]);
    expect(dels.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    // Unknown and deleted accounts are refused cleanly, for every console action (audit 31 #3).
    await expect(grantEntitlement(admin, "cnotarealuserid000000000", "theme:velvet-rope")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const gone = await makeUser();
    await deleteAccount(gone, "objection!");
    await expect(grantEntitlement(admin, gone, "theme:velvet-rope")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(setBan(admin, gone, true)).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(setUserRole(admin, gone, "MODERATOR")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await updateProfile(player, { displayName: "P", bio: "hi", avatar: DEFAULT_AVATAR, profileTheme: "velvet-rope", featuredBadge: null });
    expect((await db.user.findUniqueOrThrow({ where: { id: player } })).profileTheme).toBe("velvet-rope");
    await expect(
      updateProfile(player, { displayName: "P", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: "certified-menace" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("accounts and sessions", () => {
  it("authenticates, rotates sessions on password change", async () => {
    const id = await makeUser("hammy_two");
    await expect(authenticate("hammy_two", "wrong-password")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(authenticate("nobody", "objection!")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await authenticate("hammy_two", "objection!")).toEqual({ id });
    const a = await createSession(id);
    const b = await createSession(id);
    expect((await resolveSession(a.token))?.id).toBe(id);
    await changePassword(id, "objection!", "new-password-123", a.token);
    expect((await resolveSession(a.token))?.id).toBe(id);
    expect(await resolveSession(b.token)).toBeNull();
    expect(await resolveSession("garbage")).toBeNull();
  });

  it("expires sessions", async () => {
    const id = await makeUser();
    const s = await createSession(id);
    advance(31 * 24 * 60 * 60_000);
    expect(await resolveSession(s.token)).toBeNull();
  });
});

describe("rate limiting", () => {
  it("allows N hits per window and resets afterwards", async () => {
    for (let i = 0; i < 3; i++) expect((await hitRateLimit("test:key", 3, 60)).allowed).toBe(true);
    expect((await hitRateLimit("test:key", 3, 60)).allowed).toBe(false);
    advance(minutes(1) + 1);
    expect((await hitRateLimit("test:key", 3, 60)).allowed).toBe(true);
  });

  it("a burst of concurrent wrong-password logins gets no more checks than the limits allow (audit 26 #1)", async () => {
    await makeUser("burst_target");
    const results = await Promise.allSettled(Array.from({ length: 40 }, () => loginWithLimits("burst_target", "wrong-password-guess", "10.66.0.1")));
    const refused = results.filter((r) => r.status === "rejected" && (r.reason as { code?: string }).code === "RATE_LIMITED");
    const checked = results.length - refused.length;
    expect(checked).toBe(8); // the per-account-per-IP limit
    const row = await db.rateLimit.findUniqueOrThrow({ where: { key: "login-user-ip:burst_target:10.66.0.1" } });
    expect(row.count).toBe(8); // refused attempts were given back
    // …and the burst never touched more than its own share of the IP's allowance (audit 27 #7).
    expect(refused.every((r) => r.status === "rejected" && /that account/.test((r.reason as Error).message))).toBe(true);
    expect((await db.rateLimit.findUniqueOrThrow({ where: { key: "login:10.66.0.1" } })).count).toBe(8);
    // The correct password from the same IP is refused too while the window lasts…
    await expect(loginWithLimits("burst_target", "objection!", "10.66.0.1")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    // …but from another IP it works, and a success doesn't count against anyone.
    await loginWithLimits("burst_target", "objection!", "10.66.0.2");
    expect((await db.rateLimit.findUniqueOrThrow({ where: { key: "login-user:burst_target" } })).count).toBe(8);
    expect((await db.rateLimit.findUniqueOrThrow({ where: { key: "login:10.66.0.2" } })).count).toBe(0);
  });

  it("is atomic under concurrency", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => hitRateLimit("test:burst", 5, 60)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});
