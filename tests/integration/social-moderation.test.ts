import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { resetClock } from "@/server/clock";
import { castVote, claimCase, submitArgument } from "@/server/services/cases";
import { closeDeliberation } from "@/server/services/verdict";
import { runMaintenanceNow } from "@/server/services/maintenance";
import { toggleReaction } from "@/server/services/reactions";
import { bumpViewCount } from "@/server/queries/cases";
import {
  adjournNow,
  dismissReports,
  fileReport,
  grantEntitlement,
  removeCase,
  restoreCase,
  setBan,
  strikeArgument,
} from "@/server/services/moderation";
import { hitRateLimit } from "@/server/rate-limit";
import { auditStats } from "@/server/services/stats";
import { authenticate, changePassword, deleteAccount, updateProfile } from "@/server/services/accounts";
import { createSession, resolveSession } from "@/server/auth/sessions";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { DEFENSE_TEXT, advance, closeNow, achievementKeys, hours, stats, makeCase, makeUser, makeUsers, minutes, resetDb, toDeliberation, useFakeClock, voteAll } from "../support/helpers";

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
    for (let round = 0; round < 3; round++) {
      const results = await Promise.allSettled(Array.from({ length: 9 }, () => toggleReaction(fan, c.id, "LEGENDARY")));
      expect(results.filter((r) => r.status === "rejected")).toEqual([]);
      const rows = await db.reaction.count({ where: { caseId: c.id, type: "LEGENDARY" } });
      const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
      expect(rows).toBeLessThanOrEqual(1);
      expect(row.legendaryCount).toBe(rows);
      expect(row.reactionScore).toBe(rows * 3);
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
    const result = await fileReport(reporters[2], { caseId: c.id, target: "CASE", reason: "PERSONAL_INFO" });
    expect(result.autoReview).toBe(true);
    const row = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.moderationState).toBe("UNDER_REVIEW");
    expect(row.openReports).toBe(3);
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

    const jurors = await makeUsers(10);
    await voteAll(c.id, jurors, 7);
    const outcome = await adjournNow(admin, c.id);
    expect(outcome).toMatchObject({ kind: "closed", verdict: "GUILTY" });

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
    // Unban and vote again: no second jury-vote XP for the same case (audit 9 #3).
    await setBan(admin, rogue, false);
    await castVote(rogue, open.id, "GUILTY");
    expect(await db.xpEvent.count({ where: { userId: rogue, caseId: open.id, reason: "jury-vote" } })).toBe(1);
    expect((await auditStats(rogue)).ok).toBe(true);
  });

  it("players can't pose as an officer of the court (audit 9 #8)", async () => {
    await makeUser("real_judge", "ADMIN");
    await db.user.update({ where: { username: "real_judge" }, data: { displayName: "Judge Realname" } });
    const player = await makeUser();
    await expect(
      updateProfile(player, { displayName: "judge realname", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    for (const sneaky of ["Judge Realname.", "Judge\u200bRealname", "JUDGE  REALNAME", "Judge Réalname", "Judge Rea1name", "Judge Rеalname" /* Cyrillic е */]) {
      await expect(
        updateProfile(player, { displayName: sneaky, bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    }
    await updateProfile(player, { displayName: "Judge Mental", bio: "", avatar: DEFAULT_AVATAR, profileTheme: "mahogany", featuredBadge: null });
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

  it("is atomic under concurrency", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => hitRateLimit("test:burst", 5, 60)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});
