import { expect, test } from "@playwright/test";
import { demoPage } from "./helpers";

test.describe.configure({ mode: "serial" });

test("a full trial: confess → defend → prosecute → jury → verdict → archive", async ({ page, browser }) => {
  const suffix = Date.now().toString(36).slice(-5);
  const username = `e2e_accused_${suffix}`;
  const title = `I hid the TV remote inside the freezer ${suffix}`;

  // --- Sign up through the real form ---
  await page.goto("/signup");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("E2E Defendant");
  await page.getByLabel("Password", { exact: true }).fill("objection-123");
  await page.getByLabel("Confirm password").fill("objection-123");
  await page.getByRole("checkbox", { name: /solemnly swear/ }).check();
  await page.getByRole("button", { name: "Swear me in" }).click();
  await page.waitForURL(/\/court\?welcome=1/);
  await expect(page.getByText(/Welcome to the bar/)).toBeVisible();

  // --- Phase 1: confession (validation first) ---
  await page.goto("/confess");
  await page.getByRole("button", { name: /^Submit my confession/ }).click();
  await expect(page.getByText("Pick a category for your crime.")).toBeVisible();

  await page.locator(`label:has(input[value="roommate-disputes"])`).click();
  await page.getByLabel("Case title").fill(title);
  await page
    .getByLabel("The confession")
    // Unique per run: the court rejects word-for-word duplicate confessions (anti-spam).
    .fill(`Every time my roommate picks a show I don't like, the remote mysteriously ends up behind the frozen peas. He now watches with gloves on (${suffix}).`);
  await expect(page.getByRole("complementary", { name: "Live preview" }).getByText(title)).toBeVisible();
  await page.getByRole("checkbox", { name: /harmless, petty or fictional/ }).check();
  await page.getByRole("button", { name: /^Submit my confession/ }).click();
  await page.waitForURL(/\/cases\/\d+-.*\?filed=1/);
  await expect(page.getByText(/entered into the record/)).toBeVisible();
  const caseUrl = new URL(page.url()).pathname;
  const caseNumber = Number(caseUrl.match(/\/cases\/(\d+)/)![1]);

  // The accused can't defend themselves.
  await expect(page.getByRole("button", { name: "You can't defend your own case." })).toBeDisabled();

  // --- Phase 2: defense ---
  const attorney = await demoPage(browser, "counselor_coo");
  await attorney.goto(caseUrl);
  await attorney.getByRole("button", { name: "Take this case" }).click();
  await attorney.waitForURL(/\/defend\/.+/);
  await expect(attorney.getByText("You hold this case.")).toBeVisible();
  await attorney
    .getByLabel("Your defense")
    .fill("Your Honour, cold storage is the safest place for a remote. My client is simply protecting the household electronics from overheating during prestige television.");
  await attorney.getByRole("button", { name: "File the defense" }).click();
  await attorney.waitForURL(/\?filed=defense/);
  await expect(attorney.getByText("Defense filed!")).toBeVisible();

  // The attorney cannot also prosecute.
  await expect(attorney.getByRole("button", { name: "You defended this case." })).toBeDisabled();

  // --- Phase 3: prosecution ---
  const prosecutor = await demoPage(browser, "da_rascal");
  await prosecutor.goto("/prosecute");
  await expect(prosecutor.getByText(title)).toBeVisible();
  await prosecutor.goto(caseUrl);
  await prosecutor.getByRole("button", { name: "Prosecute this case" }).click();
  await prosecutor.waitForURL(/\/prosecute\/.+/);
  // Prosecutors see the defense they are rebutting.
  await expect(prosecutor.getByText(/cold storage is the safest place/)).toBeVisible();
  await prosecutor
    .getByLabel("Your rebuttal")
    .fill("Members of the jury, nobody needs gloves to protect a remote. The frozen peas were an accomplice, and the defendant is the mastermind of a chilling conspiracy.");
  await prosecutor.getByRole("button", { name: "File the prosecution" }).click();
  await prosecutor.waitForURL(/\?filed=prosecution/);
  await expect(prosecutor.getByRole("heading", { name: "How does the jury find the defendant?" })).toBeVisible();
  await expect(prosecutor.getByText(/You're the prosecutor, so you can't vote/)).toBeVisible();

  // The accused can't vote either.
  await page.goto(caseUrl);
  await expect(page.getByText(/You're the accused/)).toBeVisible();

  // --- Phase 4: jury (quorum is 3 in e2e) ---
  for (const [juror, choice] of [
    ["juror_whiskers", "GUILTY"],
    ["fresh_intern", "GUILTY"],
    ["hammy_the_accused", "NOT GUILTY"],
  ] as const) {
    const j = await demoPage(browser, juror);
    await j.goto(`/jury?case=${caseNumber}`);
    await expect(j.getByText("The tally stays hidden until you vote")).toBeVisible();
    await expect(j.getByRole("group", { name: /^Tally:/ })).toHaveCount(0);
    await j.getByRole("button", { name: new RegExp(`^${choice}`) }).click();
    await j.getByRole("button", { name: "Seal my vote" }).click();
    await expect(j.getByText("Your vote is sealed.")).toBeVisible();
    // After voting, the tally is revealed.
    await expect(j.getByRole("group", { name: /^Tally:/ })).toBeVisible();
    // One vote per account: the booth no longer offers voting.
    await j.goto(caseUrl);
    await expect(j.getByText("Your vote is sealed.")).toBeVisible();
    await j.context().close();
  }

  // --- Phase 5: the judge adjourns early (quorum rules still apply) ---
  const judge = await demoPage(browser, "judge_wigsworth");
  await judge.goto(`/moderation?case=${caseNumber}`);
  judge.once("dialog", (d) => d.accept());
  await judge.getByRole("button", { name: /Adjourn now/ }).click();
  // The button disappears with the deliberation, so the result is confirmed separately (audit #4).
  await expect(judge.getByRole("status").filter({ hasText: "Deliberation closed: GUILTY (2–1)." })).toBeVisible();
  // The console re-renders with the closed case (the adjourn button is gone).
  await expect(judge.getByText(/Closed · Guilty/)).toBeVisible();
  await expect(judge.getByText(/Votes: 2 guilty · 1 not guilty/)).toBeVisible();

  // Verdict is visible to everyone, including signed-out visitors.
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  await v.goto(caseUrl);
  await expect(v.getByRole("heading", { name: "Verdict: GUILTY!" })).toBeAttached();
  await expect(v.getByText("Final tally: 2 guilty · 1 not guilty")).toBeVisible();
  await expect(v.getByRole("button", { name: "Copy verdict summary" })).toBeVisible();

  // It's in the public archives and searchable.
  await v.goto(`/archives?q=${encodeURIComponent(suffix)}`);
  await expect(v.getByRole("link", { name: title })).toBeVisible();

  // OG share card renders.
  const og = await v.request.get(`${caseUrl}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");

  // --- Stats & profile ---
  await prosecutor.goto("/u/da_rascal");
  await expect(prosecutor.getByRole("heading", { name: "D.A. Rascal" })).toBeVisible();
  await page.goto(`/u/${username}`);
  await expect(page.locator("dl div", { has: page.locator("dt", { hasText: /^Found guilty$/ }) })).toContainText("1");

  // The accused got notified.
  await page.goto("/notifications");
  await expect(page.getByText("Verdict: GUILTY!").first()).toBeVisible();
});

test("signed-out players are sent to log in; non-staff can't see moderation", async ({ page, browser }) => {
  await page.goto("/court");
  await page.waitForURL(/\/login\?next=%2Fcourt/);
  const player = await demoPage(browser, "fresh_intern");
  const res = await player.goto("/moderation");
  expect(res?.status()).toBe(404);
});

test("reactions toggle and report dialog works", async ({ browser }) => {
  const p = await demoPage(browser, "fresh_intern");
  await p.goto("/cases/1");
  await p.waitForURL(/\/cases\/1-/);
  const hilarious = p.getByRole("button", { name: /Hilarious/ });
  const before = Number((await hilarious.innerText()).match(/(\d+)\s*$/)![1]);
  const wasPressed = (await hilarious.getAttribute("aria-pressed")) === "true";
  await hilarious.click();
  await expect(hilarious).toHaveAttribute("aria-pressed", String(!wasPressed));
  await expect(hilarious).toContainText(String(wasPressed ? before - 1 : before + 1));
  // Persisted on the server: survives a reload.
  await p.reload();
  await expect(p.getByRole("button", { name: /Hilarious/ })).toHaveAttribute("aria-pressed", String(!wasPressed));
  await p.getByRole("button", { name: /Hilarious/ }).click();
  await expect(p.getByRole("button", { name: /Hilarious/ })).toHaveAttribute("aria-pressed", String(wasPressed));

  await p.getByRole("button", { name: "Report to the clerks" }).click();
  await p.getByLabel("Spam").check();
  await p.getByRole("button", { name: "Submit report" }).click();
  await expect(p.getByText(/clerks will review your report/)).toBeVisible();
});
