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

## 2026-10-24 - Make domains the primary navigation

- **Decision:** The dashboard's three main skill cards are the entry points into domain detail, rather than a generic Skills tab.
- **Decision:** Domain detail contains the specific performance skills and each skill can open its own leaderboard.
- **Decision:** Avatar customization is opened by clicking the avatar in the current-class panel.
- **Decision:** Remove generic top-of-screen slogans, prominent theme controls, and the persistent bottom navigation from the next mockup iteration.
- **Why:** The user's class, domain levels, activity, and next quest are the important content; navigation should follow the user's mental model of domains and skills.

## 2026-10-24 - Make Classic RPG the default and add skill emblems

- **Decision:** Use the Classic RPG theme as the default mockup presentation.
- **Decision:** Represent domains and internal skills with simple original vector symbols inside framed, game-like emblems.
- **Decision:** Present internal domain skills in a grid so users can scan and compare them quickly.
- **Why:** The first mockup's biggest visual gap was a lack of memorable symbols and game-like visual anchors.
- **Revisit when:** We have a stronger art direction or custom icon assets to evaluate.

## 2026-10-24 - Separate current level from history

- **Decision:** Skill tiles display the current value explicitly as `Level N`.
- **Decision:** Peak level is not shown as a second line on the tile; a `History` action opens a deeper timeline with current level, all-time peak, and the rolling six-month window.
- **Why:** The tile should be scannable and unambiguous, while performance history deserves enough space to explain change over time.

## 2026-10-24 - Make the prototype intrinsically mobile

- **Decision:** Treat the mockup as a phone-width canvas even when opened in a desktop browser.
- **Decision:** Force dashboard, domain, history, leaderboard, and closet layouts to fit the phone canvas rather than switching to desktop columns based on the outer browser viewport.
- **Why:** The eventual product is a mobile app tested through Expo Go; wide-dashboard behavior was causing skill content to overflow the preview.
- **Implementation note:** The prototype canvas is approximately 430 px wide and centered on desktop for inspection.

## 2026-10-24 - Add Friends to the primary UI flow

- **Decision:** Add a Friends path to the intended navigation model.
- **Flow:** Home -> Friends -> Friend profile/levels -> friend domain and skill detail.
- **Why:** Users should be able to inspect and compare friends' levels in addition to seeing geographic leaderboard ranks.
- **Open design question:** Decide whether friend history and private details are visible by default or controlled per skill.

## 2026-10-24 - Clarify the home dashboard hierarchy

- **Decision:** Keep the clickable avatar inside the top Current Class panel as the entry point to items and cosmetics.
- **Decision:** Show domain cards in a compact two-column grid: Running beside Strength, then Cycling beside Swimming.
- **Decision:** Add a `QUESTS AND ACTIVITIES` divider before the quest and recent-activity panels.
- **Decision:** Make the quest action explicit with `Open quest`; label the activity action `See activities` while retaining the recent activity and XP summary.
- **Why:** The home screen should read as a compact character dashboard: identity first, class domains second, then the next things to do.

## 2026-10-24 - Split class pages into skill and achievement modes

- **Decision:** Use a top-right `Skills / Achievements` toggle on each class page.
- **Skills mode:** Keep Cumulative Level at top left; show the user's `Best Skill` at top right; list unlocked and locked skills in separate two-column grids.
- **Achievement mode:** Keep Cumulative Level at top left; replace the right summary with `Rarest Achievement`; list unlocked and locked achievements in separate grids.
- **Examples:** `Fastest Marathon` stays locked until a marathon is completed; achievement examples include `30 Minute 5K` and `3 Hour Marathon`.
- **Why:** This separates repeatable performance skills from milestone-style accomplishments while keeping both attached to the same class domain.

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

- **Decision:** The Current Class panel highlights specific skills such as Fastest 5K, Bench Press, and Monthly Distance rather than broad domains.
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
