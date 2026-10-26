# Core Game Model

**Status:** Proposed

## Entities

### Activity

An imported or manually entered real-world exercise event.

Suggested fields:

- `id`
- `source` (for example `strava` or `manual`)
- `type` (run, lift, cycle, etc.)
- `startedAt`
- `duration`
- `distance` when relevant
- `volume` when relevant (sets, reps, weight)
- `rawSummary` for source attribution
- `xpAwarded`

### Fitness class

Running, Cycling, and Strength are the initial fitness classes. Each tracks cumulative XP and a level independently of personal-best skills. Every eligible activity contributes volume, whether or not it sets a record.

### Skill

A specific performance metric within a class: for example, fastest 5K within Running or bench-press one-rep maximum within Strength. Skill performances do not determine class XP. Running and cycling now show all-time best elapsed distance efforts from processed imported history. Strength values and rank mappings are deferred. The earlier recent-performance level proposal below remains speculative and does not apply to current skill values.

### Character title

The character panel currently previews a playful title such as `Wrecking Ball`. Titles are separate from the three fitness classes; deriving or selecting titles remains future work.

### Avatar and cosmetics

The user's character has an avatar that represents them. Activities can award cosmetic loot such as clothing, accessories, and other equipment. Cosmetics are for expression and collection, not power.

Examples:

- A 1 km run has a small chance to drop a pair of sunglasses.
- Completing a marathon unlocks a marathon-only hat.
- Equipped items can be shown on the user's character and in leaderboard views.

### Leaderboard scope

Leaderboards can be browsed at progressively larger geographic scopes, such as neighborhood, city, province/state, country, or global. The displayed ranking should make the scope and measurement period obvious.

### Quest / challenge

An optional short-term goal that points the user toward an activity without making the app feel like a task manager.

## First XP experiment

For running, use the intentionally simple prototype rule: `1 kilometer = 1 Running XP`.

For other activities, use visibly labeled placeholder formulas until the team decides how to normalize them. Avoid presenting cross-activity comparisons as scientifically equivalent.

## Level-up behavior

When an activity crosses a threshold:

1. Show the activity and XP calculation.
2. Show the previous and new skill level.
3. Explain any unlock in plain language.
4. Offer a next action: view tree, set a goal, or return home.

## Two dimensions of skill

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

This level answers: `How much have I done over time?`

### Active / recent-performance level

This measures current ability relative to a defined performance scale. For example, a 5 km time could be mapped between a slow reference point and an elite reference point, then distributed across levels 1-100.

- The active level is based on the user's best tracked performance during a rolling six-month period.
- The system remembers the user's all-time peak active level.
- If current performance declines, the UI can show both values: `Current level 50; peak level 56`.

This level answers: `How am I performing recently?`

These levels should be displayed separately so a user does not confuse accumulated experience with athletic performance.

## Open questions

- Should XP be based on distance, time, intensity, volume, or a hybrid?
- Can one activity contribute to multiple trees?
- Should class names be discovered, selected, or both?
- How should rest, recovery, injury, and missed goals be represented?
- Are levels infinite, season-based, or capped?
- What reference data should define the low and high ends of an active-performance scale?
- Should active levels be absolute, age/sex/category adjusted, or percentile-based?
- How should incomplete, assisted, GPS-inaccurate, or suspicious performances affect active level?
- Does a leaderboard rank passive level, active level, peak active level, or multiple columns?
