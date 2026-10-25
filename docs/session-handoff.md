# Session Handoff

This file summarizes the current state at the end of the mockup session.

## Product concept captured

- Fitness activities feed RPG progression.
- Passive/cumulative domain levels represent lifetime investment, use progressively harder thresholds, and have no planned cap.
- Active skill levels represent recent performance, based on the best tracked result in a rolling six-month period.
- All-time peak active level remains visible in History.
- A user's class is derived from combinations of domain levels, such as Running plus Strength producing `Wrecking Ball`.
- Geographic leaderboards can scale from neighborhood to city, province/state, country, and global.
- Avatars can equip cosmetic loot; activity drops can be random and achievements can grant guaranteed signature items.

## Current mockup state

- Local prototype: `mockups/index.html`, `mockups/styles.css`, `mockups/app.js`.
- Local server: `http://localhost:8000`.
- Default theme: `Classic RPG`.
- Alternate themes: Cozy Quest, Arcade Stats, Modern RPG.
- Dashboard starts with the Wrecking Ball class panel.
- Class panel shows the three highest cumulative domain levels and a small clickable example avatar that opens items and cosmetics.
- Running, Strength, Cycling, and Swimming are clickable domain cards arranged in a compact two-column home grid.
- Domain detail uses a mobile-safe two-column grid of internal skills with original inline SVG symbols.
- Each class page has a `Skills / Achievements` toggle. Skills mode shows `Best Skill`, unlocked skills, and locked skills; achievement mode shows `Rarest Achievement`, unlocked achievements, and locked achievements.
- The current Running example keeps `Fastest Marathon` locked until a marathon is completed and includes achievement examples such as `30 Minute 5K` and `3 Hour Marathon`.
- Class pages now use a single large title such as `Running Class`; detailed times belong in History, and the bottom cumulative-progression panel has been removed.
- The larger class-panel avatar is the equipment/cosmetics entry point; its decorative ring is non-interactive so the avatar click target works.
- Skill tiles explicitly show values such as `Level 50`.
- Each skill tile exposes `Ranks` and `History` actions.
- History shows current level, all-time peak, rolling window, and a simple timeline chart.
- A `QUESTS AND ACTIVITIES` section divider separates the compact domain grid from the quest and recent-activity panels.
- The dashboard quest entry is now a compact clickable `Quests` panel with a quest emblem; it opens a dedicated page with Daily, Weekly, and Monthly quests.
- Each quest shows a title, description, progress, and days until expiry. The recent activity panel still has a `See activities` action and keeps its activity/XP summary.
- Persistent bottom navigation is intentionally absent.

## Design references

The original design workspace included local visual references pointing toward dense RPG skill grids, parent/child ability systems, framed skill menus, and recognizable fitness symbols. Those image references are not part of this repository; they were inspiration only, and the prototype uses original vector symbols.

## Future implementation context

- Planned repository: `https://github.com/kyleair/FitnessRPG`.
- Planned mobile development/testing path: Expo and Expo Go.
- Keep future design decisions mobile-first and validate at phone aspect ratios.

## Next recommended step

Review the Classic RPG prototype on a real phone-sized viewport, then decide whether the symbol system should stay as simple line emblems or move toward richer illustrated icon tiles.
