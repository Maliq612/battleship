# Battleship — Bugs Found & Fixes

A short rundown of the notable bugs we hit while building the Battleship game and how each was resolved.

---

## 1. Sonar audio wouldn't start until the music button was toggled
**Symptom:** On the welcome/placement screen, the looping sonar track only began playing after you turned Music off and back on — not on your first interaction with the page.

**Cause:** Browsers block audio autoplay until the user makes a gesture. Our "start on first interaction" hook listened only for `pointerdown`/`keydown`. Safari does **not** accept those as a valid media-unlock gesture — it only honors `click`/`touchend`. The Music toggle happened to be a real `click`, which is why that was the one thing that worked. A secondary issue: the hook removed itself even when a blocked attempt failed, so it never retried.

**Fix:** Added `click` and `touchend` to the unlock listeners, and kept the listener alive until a play attempt actually succeeds (a blocked attempt no longer consumes the hook). The sonar now starts on the very first click anywhere on the page.

---

## 2. The "P" in the BATTLESHIP wordmark had a flat edge on its bowl
**Symptom:** The curved inner bowl of the "P" rendered with a straight chord across it, while the visually identical "B" looked correct.

**Cause:** A WebKit rendering bug in `-webkit-text-stroke`. On the P's narrow inner curve the stroke self-intersected and closed the loop with a straight line; the B's wider bowls didn't trigger it.

**Fix:** Dropped `-webkit-text-stroke` entirely and rebuilt the dark-red outline + bevel using layered `drop-shadow` filters on the gradient text. Drop-shadows follow the glyph's true alpha shape, so the outline and fill now trace the real letterform curve.

---

## 3. White fringe around the transparent logo
**Symptom:** After keying out the logo's white background, faint white speckles remained along the red ribbon edges.

**Cause:** The first cutout only removed pure-white pixels, leaving the anti-aliased pixels where the ribbon had blended into the original white background.

**Fix:** Redid the cutout from the source image: flood-filled the background inward from the edges (so interior detail stayed solid), trimmed the 1px blended halo ring, feathered the alpha for smooth edges, and decontaminated the leftover white tint. Result: clean edges on the dark steel header.

---

## 4. Sunk-ship cells didn't turn red in Prince Mode
**Symptom:** Normally a sunk ship's cells turn light red. In Prince Mode they stayed purple.

**Cause:** A CSS specificity conflict. The Prince-Mode rule `body.prince-mode .cell` (specificity 0-2-1) outranked the `.cell.sunk` rule (0-2-0), so the purple tile always won.

**Fix:** Added a Prince-Mode-specific override, `body.prince-mode .cell.sunk`, with the light-red gradient. Sunk ships now turn red in both themes while the darker hit pegs stay visible on top.

---

## 5. A leftover highlight "box" appeared after rotating a ship
**Symptom:** On the placement screen, after pressing Rotate, a stale block of highlighted cells lingered on the board until you moved the mouse again.

**Cause:** `toggleOrientation()` flipped the orientation but never redrew the placement preview. The old (pre-rotation) highlighted cells stayed lit until the next `mousemove` re-rendered them.

**Fix:** Tracked the last hovered cell and refactored the preview drawing into a single `renderPreview()` method called from both hover **and** rotate. Rotating now immediately redraws the preview in the new orientation — no stale box, no need to wiggle the mouse.

---

## 6. The drag-and-drop ghost ship didn't rotate with `R`
**Symptom:** While dragging a ship onto the board, pressing `R` rotated the highlighted target cells but the floating ship "ghost" that follows the cursor kept its original orientation, so the two disagreed.

**Cause:** The rotate handler updated the placement orientation (which drives the cell highlight) but never re-rendered the drag-ghost element, which had been built once at drag start.

**Fix:** Re-render the drag ghost whenever orientation changes mid-drag, so the floating silhouette and the target-cell highlight always match.

---

## 7. The Prince Mode rain transition fired in both directions
**Symptom:** The purple rain transition was supposed to play only when *entering* Prince Mode, but it also played when switching back to classic mode.

**Cause:** The button's click handler called the rain transition on every toggle, regardless of which way it was switching.

**Fix:** Gated the effect so it only runs when turning Prince Mode **on** (classic → Prince), not on the way back.

---

## 8. Deploy/caching confusion on the enlarged tagline
**Symptom:** A tagline size change "didn't take" when viewing the preview.

**Cause:** Not a code bug — Vercel + browser caching was serving an older build for a short window after the push.

**Fix:** Confirmed the deployed asset actually contained the change, then hard-refreshed. Later refined the tagline to scale relative to the wordmark (spanning exactly from the "A" to the "I" of BATTLESHIP) so its size is locked at every screen width.
