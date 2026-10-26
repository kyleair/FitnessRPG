# Design QA Checklist

Use this checklist before handing a mockup to the user for manual review. The prototype is a phone-first product, so visual correctness at the target canvas matters more than how the page behaves in a wide desktop window.

## Layout safety

- Check the intended phone width, approximately 430 px, plus a narrow fallback around 390 px.
- Confirm no text, card, icon, button, progress bar, or decorative element extends beyond its parent.
- Check long titles at normal and narrow widths: `Wrecking Ball`, `Fastest Marathon`, `Monthly Distance`, and achievement names.
- Check flex and grid children with `min-width: 0`; use `minmax(0, 1fr)` where a column can shrink.
- Check that decorative pseudo-elements have `pointer-events: none` and cannot block interactive controls.
- Check that buttons and avatar targets remain above decorative layers with an appropriate stacking order.

## Content and navigation

- Every home class card must open the matching class page and show unique seeded content.
- Every interactive avatar or cosmetic action must open the equipment/cosmetics view.
- Verify the mode toggle does not overlap the summary panels and has enough spacing above and below.
- Verify current, next-level, and progress values are visible without relying on hover.

## Validation before handoff

- Run `node --check mockups/app.js`.
- Confirm `http://localhost:8000/` returns successfully.
- Inspect each major view manually at phone width: Home, every class page, Skills mode, Achievements mode, History, Ranks, Activity, and Closet.
- Only then report the change as ready for manual review.
