# Decision Log

Record decisions here as the project evolves. Keep entries short and link to the fuller design document when useful.

## 2026-10-24 - Start with a localhost prototype

- **Decision:** Use a small buildless HTML/CSS/JavaScript prototype for the first interactive mockups.
- **Why:** The early questions are about navigation, comprehension, and the feel of the progression loop. A browser prototype can test those directly while remaining quick to change.
- **Scope:** Seeded data only; no real integrations or backend.
- **Revisit when:** The team has chosen a visual direction and confirmed the core screens.

## 2026-10-24 - Treat XP formulas as experiments

- **Decision:** Use `1 kilometer = 1 Running XP` only as an illustrative starting rule.
- **Why:** It makes the first mockup understandable without prematurely claiming that all exercise can be normalized fairly.
- **Revisit when:** There is enough activity data and user testing to compare alternative formulas.

## 2026-10-24 - Explore passive and active skill levels

- **Decision:** Track cumulative activity investment separately from recent performance.
- **Proposed passive level:** Lifetime XP with progressively harder thresholds and no planned cap.
- **Proposed active level:** Best tracked performance in a rolling six-month window, with an all-time peak retained for comparison.
- **Why:** This celebrates both consistency over time and current athletic ability without collapsing them into one misleading number.
- **Revisit when:** We prototype the same skill with both values and test whether users understand the distinction.

## 2026-10-24 - Explore geographic leaderboards and cosmetic loot

- **Decision:** Explore opt-in geographic leaderboards and non-power cosmetic rewards.
- **Proposed leaderboard scopes:** Neighborhood, city, province/state, country, and global.
- **Proposed rewards:** Small random cosmetic drops from activities, plus guaranteed cosmetics for achievements such as completing a marathon.
- **Why:** Competition can provide context and cosmetics can make progression visible and personal.
- **Revisit when:** Privacy, anti-cheating, and reward-frequency rules are defined.

## 2026-10-24 - Make classes the primary navigation

- **Decision:** The dashboard's three main skill cards are the entry points into class detail, rather than a generic Skills tab.
- **Decision:** Class detail contains the specific performance skills and each skill can open its own leaderboard.
- **Decision:** Avatar customization is opened by clicking the avatar in the current-class panel.
- **Decision:** Remove generic top-of-screen slogans, prominent theme controls, and the persistent bottom navigation from the next mockup iteration.
- **Why:** The user's class, class levels, activity, and next quest are the important content; navigation should follow the user's mental model of classes and skills.

## 2026-10-24 - Make Classic RPG the default and add skill emblems

- **Decision:** Use the Classic RPG theme as the default mockup presentation.
- **Decision:** Represent classes and internal skills with simple original vector symbols inside framed, game-like emblems.
- **Decision:** Present internal class skills in a grid so users can scan and compare them quickly.
- **Why:** The first mockup's biggest visual gap was a lack of memorable symbols and game-like visual anchors.
- **Revisit when:** We have a stronger art direction or custom icon assets to evaluate.

## 2026-10-24 - Separate current level from history

- **Decision:** Skill tiles display the current value explicitly as `Level N`.
- **Decision:** Peak level is not shown as a second line on the tile; a `History` action opens a deeper timeline with current level, all-time peak, and the rolling six-month window.
- **Why:** The tile should be scannable and unambiguous, while performance history deserves enough space to explain change over time.

## 2026-10-24 - Make the prototype intrinsically mobile

- **Decision:** Treat the mockup as a phone-width canvas even when opened in a desktop browser.
- **Decision:** Force dashboard, class, history, leaderboard, and closet layouts to fit the phone canvas rather than switching to desktop columns based on the outer browser viewport.
- **Why:** The eventual product is a mobile app tested through Expo Go; wide-dashboard behavior was causing skill content to overflow the preview.
- **Implementation note:** The prototype canvas is approximately 430 px wide and centered on desktop for inspection.

## 2026-10-24 - Add Friends to the primary UI flow

- **Decision:** Add a Friends path to the intended navigation model.
- **Flow:** Home -> Friends -> Friend profile/levels -> friend class and skill detail.
- **Why:** Users should be able to inspect and compare friends' levels in addition to seeing geographic leaderboard ranks.
- **Open design question:** Decide whether friend history and private details are visible by default or controlled per skill.

## 2026-10-24 - Clarify the home dashboard hierarchy

- **Decision:** Keep the clickable avatar inside the top Current Class panel as the entry point to items and cosmetics.
- **Decision:** Show class cards in a compact two-column grid: Running beside Strength, then Cycling beside Swimming.
- **Decision:** Add a `QUESTS AND ACTIVITIES` divider before the quest and recent-activity panels.
- **Decision:** Make the quest action explicit with `Open quest`; label the activity action `See activities` while retaining the recent activity and XP summary.
- **Why:** The home screen should read as a compact character dashboard: identity first, classes second, then the next things to do.

## 2026-10-24 - Split class pages into skill and achievement modes

- **Decision:** Use a top-right `Skills / Achievements` toggle on each class page.
- **Skills mode:** Keep Cumulative Level at top left; show the user's `Best Skill` at top right; list unlocked and locked skills in separate two-column grids.
- **Achievement mode:** Keep Cumulative Level at top left; replace the right summary with `Rarest Achievement`; list unlocked and locked achievements in separate grids.
- **Examples:** `Fastest Marathon` stays locked until a marathon is completed; achievement examples include `30 Minute 5K` and `3 Hour Marathon`.
- **Why:** This separates repeatable performance skills from milestone-style accomplishments while keeping both attached to the same class.

## 2026-10-24 - Reflow class cards for the phone grid

- **Decision:** Keep class skills and achievements two-wide at the target phone width, but give each card a compact internal layout: icon column, wrapped title/details, level on its own row, and actions across the bottom.
- **Why:** The first two-column implementation retained a wide-screen icon/text/level arrangement and caused content to run past the card edge.
- **Guardrail:** Use `minmax(0, 1fr)`, `min-width: 0`, and wrapped text so long names such as `Fastest Marathon` stay inside the mobile card.

## 2026-10-24 - Simplify class-page presentation

- **Decision:** Class pages use only the large class title, with no repeated eyebrow title or explanatory paragraph.
- **Decision:** Remove performance-detail snippets from skill cards; tracked times and best-month values belong in History.
- **Decision:** Remove the cumulative progression/next-unlock panel from the bottom of the class page.
- **Decision:** Make the Current Class avatar larger and ensure the decorative panel art cannot block its click target.

## 2026-10-24 - Make class navigation and skill progress specific

- **Decision:** The Current Class panel highlights specific skills such as Fastest 5K, Bench Press, and Monthly Distance rather than broad classes.
- **Decision:** Running, Strength, Cycling, and Swimming cards open their matching class page with unique seeded skills and achievements.
- **Decision:** Unlocked skill cards show the relevant metric, next-level target, and progress between the current and next level.
- **Decision:** Add a reusable phone-width design QA checklist before manual review to catch overflow, clipping, blocked click targets, and mismatched routing.

## 2026-10-24 - Give quests their own page

- **Decision:** Replace the dashboard's detailed next-quest block with a compact clickable `Quests` panel and quest emblem.
- **Decision:** The Quests page is organized into Daily, Weekly, and Monthly sections.
- **Decision:** Every quest shows a simple title, description, progress meter, and time until expiry.
- **Why:** The home dashboard should stay scannable while the quest page provides room for multiple time horizons and goals.

## 2026-10-24 - Keep avatar access inside the class panel

- **Decision:** Remove the duplicate top-right avatar button; equipment and cosmetics are reached only by clicking the larger avatar in the Current Class panel.
- **Decision:** The three pinned entries in Current Class are specific skills and always display their values as `Level N`.
- **Decision:** Remove decorative title punctuation that does not carry meaning.

## 2026-10-24 - Balance the Current Class panel

- **Decision:** Keep Quests and Recent Activities stacked as before.
- **Decision:** Use the lower-right area of the Current Class panel by placing the three pinned specific-skill levels in a full-width row beneath the class identity and avatar.
- **Guardrail:** Preserve the phone-width canvas and keep the skill labels wrapped inside their cards.

## 2026-10-25 - Implement the native home screen with real Strava summaries

- Port the Classic RPG home hierarchy into the Expo app: framed class panel, original SVG adventurer and class emblems, four class cards, adventure board, and recent activities. Keep the HTML prototype unchanged.
- Class identity, cosmetics, quests, Fastest 5K, and Bench Press remain clearly labeled previews or unavailable values. Do not infer an exact fastest 5K from whole-activity average pace.
- Compute imported activity counts, distances, moving minutes, monthly distance, and class XP on the server. Calendar-month totals use UTC and include all imported sports; they are not a class performance level.
- First experimental XP rules: Running 1 km/XP; Cycling 5 km/XP (exclude assisted e-bike types); Swimming 250 m/XP; WeightTraining 10 moving minutes/XP. Other activity types earn no XP yet. These game rules are not physiological equivalences.
- Cumulative level costs begin at 5 XP; each next cost is `ceil(previous * 1.4)`: 5, 7, 10, 14, etc. Show within-level XP, not total lifetime XP in that meter. Level 0 is valid.
- `/api/dashboard` performs shared, bounded imports (100 recent activities initially, then recent plus up to 100 older records per eligible refresh), deduplicates IDs, and aggregates the results. Requests within one minute share a cache, including failure cooldown. Failed later imports retain the last successful snapshot with a stale flag.
- The activity cache is in memory per backend process. Restarting the backend resets history import, not OAuth tokens. Display imported scope and history incompleteness; do not present partial history as lifetime totals. Older edits/deletions outside the latest page are reconciled on a fresh full import, not instantaneously.
- Class taps open contextual progress summaries; Quests/avatar open explanatory previews; See activities expands the recent list. Full class/quest/closet routes remain future work.

## 2026-10-25 - Connect through a backend browser page in Expo Go

- Keep Expo Go and manual browser return. Native foregrounding checks connection status; a Check connection action provides a fallback. A future development build can add automatic return without replacing the backend flow.
- Give each device a 90-day opaque session stored in SecureStore (web preview: sessionStorage); persist only its hash server-side. Every activity request is authenticated and scoped to that session's athlete.
- Use one-use, ten-minute browser tickets and OAuth states, browser-cookie binding, explicit browser confirmation, and server-side code exchange. Persist pending attempts so a backend restart need not interrupt authorization.
- Store per-athlete tokens and atomic activity snapshots/import cursors in ignored local SQLite. Retain the existing bounded import and one-minute cooldown. Account-scoped work is serialized in one backend process. Restarting resumes imports instead of erasing progress; this supersedes the earlier in-memory-only decision.
- Do not expose the previous shared token cache through a default account. Existing installations authorize once from the app. Sign out revokes a device session; it does not delete the athlete or revoke Strava globally.
- PUBLIC_BACKEND_URL is explicit, phone-reachable configuration rather than a URL inferred from untrusted request headers. Its hostname/IP must match the Strava callback domain. Do not change the website's application settings automatically.
- This is a local development foundation, with one process per database. Hosted transport, token encryption at rest, operational abuse controls, and deletion/revocation handling remain deployment work.

## 2026-10-25 - Authorize local development sessions on the computer

- Supersedes the LAN callback instructions: phone API requests still use the computer's LAN IP, but browser authorization always uses 127.0.0.1 and the backend PORT. Strava permits loopback callbacks without changing the shared callback-domain setting.
- Connect Strava creates a 12-character random hex pairing code, displayed in groups of four. Enter it on the backend computer at /connect, then explicitly confirm and authorize in that browser. The code identifies the originating phone session, not a default shared account.
- Codes expire in ten minutes, are stored hashed, are invalidated on regeneration/sign-out, and remain protected by the existing form CSRF, browser cookie, and single-use OAuth state checks. Browser routes require a loopback peer and the configured loopback Host; LAN clients can only initiate/check their own session through the authenticated API.
- Existing sessions and imported data are preserved. No schema migration or extra dependency is needed. This computer-browser handoff is for local development; a future hosted app will need its own HTTPS browser flow.

## 2026-10-26 - Default to basic Strava activity access

- Request activity:read by default, while accepting either activity:read or activity:read_all on the callback. Plain read is not sufficient.
- Honor broader grants: private activities are imported when activity:read_all is granted. Do not add a separate visibility filter or reset existing connections/history.
- Label completed imports as all accessible history; the granted permissions determine which activities are accessible.

## 2026-10-26 - Start with three independent class XP tracks

- Running, Strength, and Cycling are the only active classes. The API exposes a `classes` collection and an activity `classKey`; skills and personal-best ranks are deferred.
- Class XP measures accumulated activity volume independently of skill performances. Retain experimental rates of 1 km per Running XP and 5 km per Cycling XP. Level costs remain 5, 7, 10, 14, etc., using ceil(previous * 1.4).
- Strength will use total pounds lifted (weight times completed reps across sets). Its XP conversion remains undecided. Strava summaries provide no lifting volume, so show Level 0 / 0 XP with an explicit unavailable-volume explanation. This supersedes the 10-minute Strength XP experiment; duration earns no Strength XP.
- Derive totals from the existing deduplicated, persisted per-account activity snapshots for now. This preserves account isolation and restart recovery without introducing a second stored total that could drift. Existing latest-page edit/deletion reconciliation limitations still apply.
- No schema migration or account reset is required for this slice. Per-activity XP contributions, set logging, and cached class totals can be introduced when supporting weight records or incremental processing.
- The historical browser mockup remains a design reference; the native app and its demo now expose three classes. Imported-history completeness remains visible; these totals are not claimed as full lifetime totals until history is complete.

## 2026-10-26 - Use class terminology consistently

- Running, Cycling, and Strength are fitness classes; specific performance metrics within them are skills. Playful character labels are titles.
- Rename the dashboard API collection to `classes` and recent-activity associations to `classKey`, with matching frontend types, backend helpers, tests, mockup identifiers, and documentation. No legacy aliases remain.
- Saved activity snapshots do not contain these derived fields, so no database migration is required. Restart the backend and reload the app together for the new API contract.

## 2026-10-26 - Add all-time distance skills without tiers

- Running skills: 1K, 5K, 10K, half marathon (21,097.5 m), marathon (42,195 m). Cycling skills: 5K, 20K, 50K, 75K, 100K. Deadlift, Squat, and Bench press show empty 1RM values until manual strength metrics are implemented.

## 2026-10-28 - Organize class skills by subclass

- **Decision:** Class pages group skills into Running/Cycling Speed, Endurance, and Climbing sections, and Strength Push, Pull, Legs, and Volume sections.
- **Why:** Users should be able to understand what kind of ability each skill represents instead of scanning one undifferentiated list.
- **Scope:** Add the 100M running skill under Speed; keep unsupported sections visible with an empty state so future metrics have a clear home. Existing XP and skill-result rules are unchanged.
- Best means the fastest continuous target-distance effort inside an eligible activity, across processed accessible imported history. Use elapsed time, including stops within the effort; never scale whole-activity average pace. This supersedes the proposed rolling six-month performance window for this release. No ranks, skill levels, or tiers.
- Compute best times from Strava distance/time streams with piecewise-linear interpolation between samples. Results are sample-based estimates and can differ from Strava's own best-effort calculation. Non-monotonic or invalid streams are unavailable; missing data never becomes a fabricated time.
- Save per-activity results, source fingerprint, calculation version, fetch time, and retry metadata inside each account's existing atomic SQLite snapshot. Retain every processed activity's results so corrections/deletions can reveal a runner-up. Equal times keep the earliest activity date. No database schema migration or reconnect is needed.
- Each eligible sync fetches at most three streams, in addition to the existing bounded activity imports. Requests coalesce; processing resumes across restarts. Transient stream failures preserve cached results and XP and retry later, with fair ordering so failures do not block older activities. Successful/missing streams are eligible for rechecking after 24 hours; changed summary fingerprints invalidate results immediately.
- Show pending activity count, unavailable-stream count, failed-refresh state, and imported-history scope in class details. Processing continues on eligible refreshes, not on a standalone background scheduler. Older edits/deletions outside the latest import page still require a fresh history reconciliation.
- Class details use the existing dashboard modal; adding navigation routes is outside this slice. XP remains independent of all skill calculations. Demo skills are empty and explicitly sample data.

## 2026-10-26 - Match class pages to the Classic RPG design

- Class cards navigate with Expo Router to dedicated class routes instead of opening the dashboard modal. Router owns the app entry and a stack in `src/app/`; non-route UI stays in `src/screens/`.
- Reuse the mockup's framed summaries, emblems, two-column skill tiles, and separate unlocked/locked sections. Recorded results appear above locked tiles; locked means no recorded result, including unprocessed or unavailable activity data. Empty strength skills remain locked until strength entry exists.
- Show cumulative class level and recorded skill count in the top summaries. A cross-distance best-skill ranking, achievement mode, tiers, and skill-level progress bars remain deferred rather than showing invented values or inactive controls.
- Share the loaded dashboard across routes, support direct class URLs and platform back navigation, and allow pull-to-refresh on class pages. Keep source activity/date on recorded tiles and import/processing explanations below the grids.

## 2026-10-26 - Prefer Strava running best efforts

- Running now requests activity details and uses positive elapsed times from `best_efforts` for our five target distances. Accept up to one meter of provider distance rounding, including 21,097 m for the half marathon. Ignore unrelated distances and invalid times. No running stream fallback.
- Cycling retains distance/time stream calculations. Result attribution distinguishes `strava_best_efforts` from `distance_time_stream_v1`.
- Running cache version increments to 2; existing calculated running results are hidden and reprocessed through the bounded sync queue. Cycling stays at version 1 so its cached results survive. Missing running best efforts remain empty and are eligible for the existing daily recheck. Class XP and the three-activity sync budget are unchanged.

## 2026-10-28 - Increase cycling XP per kilometer

- Change the experimental Cycling rate from 5 km per XP to 3 km per XP, including fractional XP. Running, Strength, eligible activity types, and level thresholds stay unchanged.
- Apply the rate to imported activity totals, recent activities, and demo progress. Saved activity distances are recalculated with the new rate after restarting the backend; no migration or reconnect is needed.

## 2026-10-28 - Persist a budget-aware import queue and retain processed workouts

- Replace the manual one-minute/three-activity batches with consecutive 200-summary pages and an automatic backend skill queue. The first page blocks initial load; subsequent pages and skills run off-screen while the server runs. The app polls saved progress only while active and work remains.
- Serialize API reads through an application-wide gate using both read and overall 15-minute/daily response headers. Reserve requests durably before sending; persist usage across restarts. Missing headers fall back to 25 reads per 15 minutes and 1,000 per UTC day. Pause on exhausted budgets/429 and resume at reset; transient skill failures retry after 15 minutes without blocking other pending activities.
- Save every summary page and computed skill result atomically. Existing account snapshots/cursors/results are preserved, and SQLite creates an additional budget table automatically. Pending work resumes on the first visit after a server restart. Stopping/reconnecting drains in-flight work before closing/replacing its service.
- After initial history import, a visit initiates at most one successful incremental activity check per UTC day. Persist the scan cursor across budget pauses/restarts and fetch details/streams only for new or unprocessed workouts. No daily checks start from queue timers alone.
- Treat imported summaries and successfully processed skills (including missing/empty skill data) as permanent. Remove the 24-hour refetch cycle. Explicit calculation-version changes may still require one-time reprocessing. Failed requests remain pending.
- Incremental checks use activity start time with a one-second overlap at the newest saved activity, deduplicating IDs. Edits/deletions and backdated uploads older than that boundary require future explicit reconciliation. A workout completed after today's check waits until the next day's visit. These are intentional tradeoffs for reducing calls.
- This supersedes the earlier three-request budget, daily skill rechecking, and latest-page edit/deletion reconciliation. XP and best-effort definitions are otherwise unchanged.
