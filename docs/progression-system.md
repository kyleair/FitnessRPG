# Progression System

**Status:** Early proposal

## Skill tree shape

Start with three visible trees for mockups:

1. Running
2. Strength / Weight Lifting
3. Cycling

Each tree should show a current level, a progress bar, recent contributing activities, and a few upcoming unlocks. Keep the first tree shallow enough to understand at a glance.

## Two kinds of skill level

The current concept separates skill level into two complementary dimensions:

### Passive / cumulative level

This measures total lifetime investment in an activity. Running XP is awarded for every kilometer, and level thresholds become progressively harder with no planned cap.

Illustrative thresholds:

```text
Level 0 -> 1: 5 XP
Level 1 -> 2: 7 XP
Level 2 -> 3: 10 XP
Level 3 -> 4: 14 XP
...
```

### Active / recent-performance level

This measures current ability from the user's best tracked performance during a rolling six-month period. The system remembers the all-time peak, so a user can see `Current level 50; peak level 56` after a period of decline.

For a 5 km example, the fastest and slowest reference performances define the endpoints, and times in between are distributed across levels 1-100. The reference model is still an open design question.

Passive level answers `How much have I done?`; active level answers `How am I performing recently?`.

## Example progression

```text
5 km run
  → +5 Running XP
  → Running level 1, 7/10 XP becomes Running level 2
  → unlock: “Long Stride” badge or flavor perk
```

The exact threshold above is illustrative only.

## Cross-skill identity

Character titles are a proposed playful summary of a user's current mix of skills, not a performance ranking.

Possible examples:

- Running 2 + Strength 4 → `Wrecking Ball`
- Cycling 4 + Running 3 → `Road Goblin`
- Strength 5 + Cycling 1 → `Pedal Press`

Use a small number of combinations in the mockup so users understand the idea before the system becomes combinatorial.

## Design constraints

- Progress must be understandable without reading a rulebook.
- A user should receive feedback after every meaningful activity.
- The system should support many activity types later without making the first screen noisy.
- Do not use shame, streak loss, or public ranking as the primary motivator.

## Leaderboards

Explore leaderboards at multiple geographic scopes: neighborhood, city, province/state, country, and global. The first prototype should make the selected scope, measurement period, and ranking metric explicit. Participation and location visibility should be opt-in.

## Cosmetic progression

Activities can award random cosmetic loot, while specific achievements can grant guaranteed signature items. For example, a 1 km run might have a small chance to drop sunglasses, while completing a marathon could unlock a marathon-only hat. Cosmetics should affect expression and collection, not fitness power.

## Balance notes

XP values are easy to game if they are based on a single raw metric. Before production, validate against duplicate imports, GPS errors, manually edited activities, and very different workout styles.
