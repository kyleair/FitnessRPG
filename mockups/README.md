# Mockup Plan

## Current prototype

Open [index.html](index.html) in a browser, or serve the `mockups` folder from a local web server.

The prototype includes three switchable visual directions:

- **Cozy Quest** - warm, friendly, collectible, and character-led.
- **Arcade Stats** - high-energy, dark, and competitive.
- **Modern RPG** - calmer, cleaner, and closer to a serious fitness product.

Each direction uses the same seeded flows so visual preference does not get confused with information architecture:

- Home dashboard
- Activity reward and XP breakdown
- Skill trees with cumulative, active, and peak performance concepts
- Geographic leaderboard
- Avatar closet with random and achievement cosmetics

The most useful review is to note what should be kept independent of the theme: the reward explanation, the two skill dimensions, the class identity, and the privacy treatment around rankings.

## Revision notes

The current prototype incorporates the first design critique:

- The dashboard no longer opens with a generic slogan.
- Theme switching is tucked into a small secondary control.
- The current-class panel pins the three highest cumulative class levels.
- The class panel includes a clickable example avatar that opens the items/cosmetics view.
- Running, Strength, Cycling, and Swimming cards are compact two-column class entry points on the phone canvas.
- Class detail separates cumulative class level from internal performance skills.
- Class detail has a Skills/Achievements toggle; each mode preserves cumulative level and separates unlocked from locked content.
- Skills mode summarizes the user's Best Skill; Achievement mode summarizes the Rarest Achievement.
- Class emblems use distinct colors and icon treatments so Running, Strength, Cycling, and Swimming scan differently at a glance.
- Individual skills link to their own leaderboard.
- The avatar in the class panel opens customization.
- The home dashboard uses a `QUESTS AND ACTIVITIES` divider; its compact `Quests` panel opens a Daily / Weekly / Monthly quest page, while the activity action is `See activities`.
- Quest cards show title, description, progress, and expiry.
- The persistent bottom navigation has been removed.

The fourth theme, `Classic RPG`, explores an old-school game aesthetic using parchment-like hierarchy, stone/leather tones, gold borders, serif display type, and menu-panel framing. It is intentionally a visual direction rather than a claim that the final product should imitate any one game.

The current default is now `Classic RPG`. The class detail view also uses a grid of original inline vector emblems for Running, Strength, Cycling, Speed, Endurance, Consistency, and Quest/Milestone skills.

The intended action map is available in [ui-flow.html](ui-flow.html). It includes the new Friends path: Home -> Friends -> Friend levels -> Friend class/skill detail.

Before handing off visual changes, use the [design QA checklist](../docs/design-qa.md) to check phone-width overflow, long text, click targets, and view-specific routing.

The mockup canvas is intentionally phone-width (approximately 430 px) when viewed on desktop, so layout decisions stay close to the eventual Expo/Expo Go mobile experience. The planned implementation repository is `https://github.com/kyleair/FitnessRPG`.

Important review notes:

- The canvas is mobile-first regardless of the browser viewport; do not reintroduce desktop grid behavior inside it.
- Skill values should always be written as `Level N`.
- Keep peak values in the History view rather than crowding the skill tile.
- The original workspace used local reference images for dense RPG skill grids and framed icon systems. Those images are intentionally not included here; use the prototype's original symbols as the source of truth.

## Recommended format

Build a small, buildless HTML/CSS/JavaScript localhost prototype. It will be faster to iterate than a set of static board images once the first screen exists, because the important questions are about flow:

- What does the user see after a workout?
- Where does the user understand XP and level progression?
- Does the skill-tree view feel motivating or overwhelming?
- Is the class reveal delightful and understandable?
- Can a user find the next thing to do?

Static 2D mockups are still useful for comparing visual styles side by side. The recommended sequence is:

1. Create two static visual directions for the same home screen.
2. Choose one direction.
3. Turn that direction into a clickable localhost prototype with seeded data.

## First flows

### Flow 1: Home / character dashboard

Show current class, recent activity, three skill cards, overall progress, and a clear next action.

### Flow 2: Activity imported

Show a 5 km run from Strava, the `+5 Running XP` explanation, and the resulting progress update.

### Flow 3: Skill tree

Show Running, Strength, and Cycling branches with current level, next unlock, and recent contributing activities.

### Flow 4: Class reveal

Show how two or more skill levels combine into a funny class name, with a short explanation and a dismissible celebration.

### Flow 5: Connections

Show Strava connection state and a mock sync action with transparent seeded data.

## Prototype data

Use a small deterministic fixture set:

- 5 km run from Strava
- 30-minute cycling activity
- One strength session with sets/reps/weight
- Running level 2
- Strength level 4
- Current class: `Wrecking Ball`

## Prototype guardrails

- No real OAuth or fitness API calls.
- No account system.
- No persistent backend required.
- Buttons can change local screen state and counters only.
- Label simulated behavior clearly where a user could mistake it for a real sync.
