# Design Direction

**Status:** Proposed for mockups

## Desired feeling

An old-school RPG character sheet adapted for fitness: readable cards, strong progress feedback, expressive symbols, compact stat tiles, and occasional silly flavor text.

The primary layout target is a phone viewport. Desktop browser viewing should present a centered phone-width canvas rather than a wide dashboard.

The mockup should never rely on the desktop browser width to decide whether it is mobile. The canvas itself is phone-width, so card and grid layouts must be mobile-safe at all times.

## Interface principles

- Put today’s actionable progress first.
- Keep the XP calculation visible; mystery is fun for class names, not for earned rewards.
- Use color and motion to celebrate meaningful events, not every tap.
- Let a user understand their character in under ten seconds.
- Keep dense data behind detail views.
- Design for one-thumb navigation and short sessions.

## Candidate visual directions

### A. Cozy quest log

Warm backgrounds, parchment-like panels, rounded badges, friendly character illustrations.

### B. Arcade stat screen

Dark surfaces, bright accent colors, chunky meters, punchy level-up moments.

### C. Modern fitness RPG

Mostly neutral UI, restrained gradients, large numeric progress, with playful class names and icons as the personality layer.

The first browser prototype should compare A and C, with B reserved as a higher-energy variant.

## Accessibility baseline

- Never use color alone to communicate skill type or status.
- Maintain readable contrast and large tap targets.
- Pair animation with static labels.
- Keep critical progress available without sound.

## Navigation feedback incorporated

- Avoid decorative slogans or generic motivational copy at the top of the dashboard.
- Treat visual themes as a secondary comparison/control, not primary product content.
- Pin the user's three highest cumulative class levels in the current-class panel.
- Make the three main classes (Running, Strength, Cycling) the primary dashboard entry points.
- Clicking a class opens the skills inside it, such as Fastest 5K, Fastest Marathon, or Monthly Distance.
- Each specific performance skill should link to its own leaderboard.
- Make avatar customization accessible by clicking the avatar in the current-class panel.
- Keep recent activity and next quest visible on the dashboard.
- Avoid a persistent bottom navigation bar until the product information architecture actually needs one.
- Use simple original symbols and framed emblems to make classes and internal skills visually memorable.
- Treat the skill detail view as a grid of individual skill tiles, not only a vertical list.
- Write skill values explicitly as `Level 50`, not bare numbers.
- Keep the tile focused on current level; expose peak/current progression history through a separate `History` action.

## Symbol direction

The first symbol set is intentionally simple and UI-native: runner, strength, cycling, speed, endurance, consistency, and quest. The symbols use original inline vector shapes inside circular RPG-style emblems so they remain crisp, scalable, and easy to revise before commissioning a final art set.

The Classic RPG theme is now the default prototype theme. Other palettes remain available as secondary comparison options.

For the Classic RPG treatment, use a fantasy display font for headings and explicit RPG labels for stats, while keeping the timeline view readable and modern enough to scan.

## Current interaction model

- Dashboard class panel comes first.
- Class cards open class detail.
- Class detail uses a mobile-safe grid of internal skills.
- `Ranks` opens the leaderboard for that specific skill.
- `History` opens a timeline showing current level, peak level, and the six-month active-performance window.
- Avatar click opens the cosmetic closet.

## Avatar reference

The original workspace used a local chibi adventurer image as visual reference for the dashboard avatar: friendly proportions, a green adventurer cloak, cream tunic, brown utility gear, and green athletic shoes. That image is not included here; the mockup approximates those cues with CSS so the prototype remains lightweight and easy to replace with final art later.
