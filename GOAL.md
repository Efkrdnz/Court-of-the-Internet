Build a complete, polished, production-oriented full-stack web application called Court of the Internet, a hilarious multiplayer social courtroom game where real players confess ridiculous offenses, defend strangers, prosecute defendants, serve on juries, and build public legal reputations.
You are the autonomous lead developer, game designer, UI/UX designer, visual designer, and QA engineer for this project.
IMPORTANT AUTONOMY INSTRUCTIONS:

* Do NOT ask me any questions, request confirmations, or pause for input.
* Make all architectural, technical, visual, and gameplay decisions independently.
* Start by thoroughly inspecting the project environment and creating a detailed implementation plan.
* Execute the entire plan autonomously from beginning to end.
* Do not stop after planning, scaffolding, or implementing a basic prototype.
* Treat every development phase as equally important. Allocate comparable effort and attention to architecture, backend, gameplay, frontend, visual design, integration, testing, and polish. Do not spend 80% of your effort on the initial setup and rush everything else.
* Maintain a progress checklist and verify every phase before moving forward.
* Prioritize quality and completeness over speed. Take as much time as reasonably necessary.
* When you encounter errors, debug and resolve them independently.
* Never substitute nonfunctional buttons, fake backend functionality, or placeholder screens for completed features.
* If credentials or external services are unavailable, implement a functional local alternative and document how to connect production services later.
* Continue until the application is functional, tested, visually polished, and ready for deployment, or until a genuine external blocker prevents further progress.

1. Core Concept
Court of the Internet is a community-driven courtroom simulator where players take on three primary roles:
The Accused: Confesses to a ridiculous offense.
The Defense Attorney: Defends another player's offense through a persuasive, clever, or hilarious argument.
The Prosecutor: Reads the accusation and defense, then attempts to convince the jury to convict.
Other users participate as jurors, voting Guilty or Not Guilty after reviewing all three statements.
The game should feel like a prestigious, overly serious legal institution handling the dumbest possible disputes.
Examples:

* "I ate my roommate's pizza and blamed his girlfriend."
* "I secretly unplugged my friend's controller so I could win."
* "I told my entire Discord server I was asleep while playing another game."
* "I deliberately spoiled the ending of an anime because my friend called it mid."
* "I stole one French fry from everyone at the table."

The contrast between serious courtroom presentation and absurd subject matter is fundamental to the product's identity.
2. Gameplay and Case Lifecycle
Implement a complete server-enforced case lifecycle.
Phase 1 — Confession

* A player creates a case with a title, category, confession, and optional additional context.
* Allow anonymous public display while retaining internal account ownership.
* Automatically assign a unique case number.
* Validate submissions and prevent spam.
* Case enters the Awaiting Defense queue.

Phase 2 — Defense

* Another player claims the case as its attorney.
* The attorney reads the confession and submits exactly one defense.
* Limit defense length to approximately 750 characters.
* Prevent the accused from defending themselves.
* Case advances to Awaiting Prosecution.

Phase 3 — Prosecution

* A different player claims the case.
* They see the original confession and completed defense.
* They submit exactly one rebuttal.
* Prevent any existing participant from prosecuting their own case.
* Case advances to Jury Deliberation.

Phase 4 — Jury

* Eligible players read the complete case.
* Jurors cast one Guilty or Not Guilty vote.
* Prevent case participants from voting on their own cases.
* Enforce one vote per account per case.
* Hide aggregate voting results until the juror has voted or the case has closed.
* Voting remains open for 24 hours.
* Require at least 10 votes for a standard verdict.
* Define sensible behavior for low participation, including extensions or an inconclusive result.

Phase 5 — Verdict

* Calculate the result on the server.
* Guilty majority = prosecution victory.
* Not Guilty majority = defense victory.
* Exact tie = mistrial.
* Reveal an entertaining verdict animation.
* Award experience, reputation, and achievements.
* Move the case into the permanent public archives.
* Make the case shareable through a unique URL.

Implement robust state transitions, database transactions, concurrency protection, and authorization so users cannot bypass the intended gameplay sequence.
Handle abandoned cases through claim expiration and requeueing.
3. Three Main Game Modes
Create three visually distinct primary gameplay entry points.
Confess a Crime

* Dramatic confession form.
* Playful category selection.
* Live case preview.
* Optional anonymous identity.
* Submit and track case progression.

Become an Attorney

* Browse or receive available cases.
* Claim a case.
* Write a defense.
* Build a defense win streak.
* Earn attorney-specific rankings.

Become a Prosecutor

* Browse cases awaiting prosecution.
* Read existing defenses.
* Write compelling rebuttals.
* Build a prosecution record.
* Earn prosecutor-specific rankings.

Additionally implement Jury Duty, accessible to all eligible players.
Make each activity satisfying independently so users always have something entertaining to do.
4. Visual Identity and Art Direction
The application must look exceptional, not like a generic AI-generated SaaS dashboard.
Use a dramatic, stylish courtroom aesthetic with:

* Deep burgundy, charcoal, black, parchment, ivory, and gold.
* Elegant legal typography paired with playful modern UI typography.
* Ornate borders, case files, wax seals, evidence stamps, and official-looking documents.
* Dramatic lighting, tasteful shadows, polished transitions, and responsive layouts.
* Custom visual components rather than generic card grids everywhere.

IMPORTANT: Include funny, goofy, memorable visuals throughout the experience.
Create or source appropriately licensed illustrations, SVG artwork, icons, and animated visual elements such as:

* A ridiculously serious cartoon judge wearing an oversized powdered wig.
* A pigeon dressed as an attorney holding a briefcase.
* A raccoon prosecutor pointing dramatically at evidence.
* A suspicious-looking hamster defendant.
* A muscular courtroom bailiff guarding a stolen sandwich.
* A jury of judgmental cats.
* A crying slice of pizza appearing in a case about food theft.
* Dramatic "GUILTY" and "NOT GUILTY" stamps.
* Funny courtroom doodles, evidence folders, legal seals, and absurd achievement icons.

These are examples, not a rigid asset list. Exercise creative freedom.
Use original, cohesive visual assets. Do not rely on random mismatched emojis as the primary artwork.
Where image-generation tools are unavailable, create high-quality custom SVG illustrations and CSS-based artwork. Never claim generated assets exist when they do not.
Add tasteful microinteractions:

* Gavel slam animations.
* Stamping verdicts onto case files.
* Animated case folders opening.
* Hover reactions on character illustrations.
* Dramatic jury voting transitions.
* Confetti or theatrical effects after winning a case.
* Funny empty states and loading messages.

Make the experience feel like an actual indie browser game with its own personality.
Avoid excessive animation that interferes with usability. Support reduced-motion preferences.
5. Pages and Navigation
Implement the following complete pages:
Landing Page

* Visually striking hero section.
* Funny headline and subheading.
* Animated courtroom scene.
* Clear buttons for Confess, Defend, Prosecute, and Jury Duty.
* Featured completed cases.
* Community statistics.
* Explanation of how the game works.

Courtroom Dashboard

* Available cases grouped by stage.
* Current cases involving the logged-in user.
* Pending actions.
* Daily activity.
* Recommended cases.

Confession Page

* Polished submission form.
* Category selection.
* Character counter.
* Validation and preview.

Attorney and Prosecutor Queues

* Browseable case listings.
* Filters and sorting.
* Claiming mechanism.
* Dedicated argument editor.

Jury Duty

* Complete case presentation.
* Distinct visual treatment for confession, defense, and prosecution.
* Voting interface.
* Verdict reveal where appropriate.

Public Case Archives

* Searchable completed cases.
* Categories.
* Sorting by recent, popular, controversial, and funniest.
* Verdict statistics.
* Public share links.

Case Detail

* Complete timeline.
* All three arguments.
* Participant profiles.
* Jury results.
* Verdict animation.
* Related cases.

Player Profiles

* Public username and avatar.
* Experience and level.
* Role-specific statistics.
* Win rates and streaks.
* Achievements.
* Case history.
* Customizable profile appearance.

Leaderboards

* Best defense attorneys.
* Best prosecutors.
* Most convicted defendants.
* Longest win streaks.
* Most active jurors.
* Most entertaining cases.

Settings and Moderation

* Account settings.
* Reporting tools.
* Content controls.
* Administrative moderation interface.

All pages must work on desktop and mobile.
6. Statistics, Progression, and Achievements
Implement a meaningful progression system.
Track:

* Total cases submitted.
* Guilty and Not Guilty verdicts.
* Defense victories and defeats.
* Prosecution victories and defeats.
* Role-specific win percentages.
* Current and longest streaks.
* Jury participation.
* Case popularity.
* Experience and level.
* Earned achievements.

Use minimum participation thresholds for competitive leaderboards to avoid misleading rankings.
Create entertaining achievements such as:

* Certified Menace.
* Objection Overruled.
* Professional Liar.
* Public Enemy Number One.
* Saul Goodman's Apprentice.
* The People's Champion.
* First Conviction.
* Unstoppable Attorney.
* Serial Defendant.
* Justice Has Been Served.

Use original achievement art and distinctive unlock notifications.
Make progression engaging without allowing paid advantages to influence verdicts.
7. Social Features and Virality
Implement:

* Shareable case links.
* Open Graph previews.
* Copyable verdict summaries.
* Shareable result cards.
* Public profiles.
* Funny case titles and categories.
* Case reactions such as Hilarious, Outrageous, and Legendary.
* Featured case of the day.
* Community highlights.

Design the product to encourage people to share funny cases on Discord, Reddit, TikTok, and other social platforms.
Avoid requiring registration just to browse public completed cases.
8. Monetization Architecture
Prepare the application for future monetization without making payments a dependency of the initial release.
Design extensible support for:

* Premium profile themes.
* Cosmetic badges.
* Special courtroom appearances.
* Additional profile customization.
* Private courtrooms for friend groups.
* Advanced statistics.
* Premium memberships.

Keep gameplay fair. Never allow users to purchase votes, manipulate verdicts, or gain competitive advantages through payment.
Do not integrate a live payment processor unless suitable credentials and infrastructure are already available.
9. Technical Architecture
Use a modern, maintainable TypeScript stack.
Preferred:

* Next.js with App Router.
* TypeScript with strict type checking.
* Tailwind CSS.
* A coherent component system.
* PostgreSQL and Prisma, or an equally suitable persistence layer.
* Supabase authentication where appropriate.
* Zod validation.
* Server-side authorization and business logic.
* Framer Motion or Motion for polished animations.
* Vitest and Playwright for testing.

Choose sensible alternatives if the existing environment or project architecture makes them preferable.
Provide a functional local development setup that does not require me to configure external services before trying the application.
Use a real persistent database rather than hardcoded arrays for gameplay.
Implement:

* Proper relational data models.
* Secure authentication.
* Case ownership and role permissions.
* Atomic claim and voting operations.
* Server-enforced lifecycle transitions.
* Input validation and output sanitization.
* Rate limiting where appropriate.
* Error handling.
* Database migrations.
* Seed data for development.
* Efficient queries and pagination.
* Accessible UI components.
* Responsive layouts.

Never trust client-side state for verdicts, role eligibility, or competitive statistics.
10. Community Safety and Moderation
This is a humorous fictional courtroom game, not a platform for exposing people or reporting actual criminal activity.
Clearly establish community rules.
Allow harmless confessions, fictional wrongdoing, petty social disputes, and absurd scenarios.
Disallow:

* Doxxing and personal information.
* Serious accusations against identifiable real individuals.
* Threats or encouragement of violence.
* Harassment and hate speech.
* Sexual exploitation content.
* Illegal content.
* Attempts to organize real-world harm.

Implement reporting, administrative removal, moderation states, and basic anti-spam protections.
Avoid displaying private account information when anonymous confession mode is enabled.
11. Autonomous Development Process
Before writing implementation code, inspect the repository and environment, identify constraints, and create a detailed project plan.
Divide development into these phases:

1. Product architecture and gameplay specification.
2. Database design and backend foundations.
3. Authentication, authorization, and case lifecycle.
4. Complete gameplay interfaces and interactions.
5. Visual identity, original illustrations, and animations.
6. Statistics, profiles, achievements, and leaderboards.
7. Archives, discovery, sharing, and social features.
8. Moderation, security, and edge cases.
9. Integration testing, accessibility, and responsive polish.
10. Final debugging, documentation, and deployment preparation.

CRITICAL EXECUTION RULES:
Do not rush the later phases.
Treat each phase as a substantial independent deliverable requiring design, implementation, review, and testing.
Reserve meaningful time and effort for every phase, especially visual polish, integration, and testing.
Maintain a written checklist of progress.
After each phase:

* Review the implementation against the requirements.
* Run relevant tests.
* Fix identified problems.
* Update the checklist.
* Continue autonomously.

Do not declare a phase complete merely because files have been created.
Do not repeatedly ask for permission or confirmation.
Do not abandon important requirements because the application has reached a superficially functional state.
If an optional feature is too complex, implement a coherent smaller version and document the limitation rather than creating a fake UI.
Use available development tools and subagents where beneficial, but ensure changes are integrated and tested.
12. Final Quality Requirements
Before finishing, verify:

* The application starts successfully.
* The complete confession → defense → prosecution → jury → verdict → archive lifecycle works.
* Role restrictions are enforced.
* Users cannot vote multiple times.
* Case claims cannot be stolen through concurrent requests.
* Statistics are calculated correctly.
* Profiles and leaderboards work.
* Archives display real persisted data.
* Navigation is functional.
* Forms have appropriate validation.
* Visual assets render correctly.
* Animations work without breaking interactions.
* Mobile layouts are usable.
* No obvious runtime, build, or TypeScript errors remain.
* Important gameplay flows have automated tests.
* The README explains setup, development, and deployment.
* Remaining external dependencies and limitations are clearly documented.

Finish by providing a concise summary of what was implemented, how to run it, what was actually tested, and any remaining limitations.
FINAL DIRECTIVE:
Build this as a complete, memorable, entertaining indie web game, not a generic dashboard, mockup, or proof of concept.
Take ownership of the project. Make independent decisions. Solve problems without asking me questions. Give every major system and visual component the attention it deserves.
The end result should feel like a real product that people would enjoy using, laughing at, competing in, and sharing with friends.
Begin planning immediately, then execute the plan autonomously until completion.
