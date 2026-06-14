# Battleship — Bugs Found & Fixes

A short rundown of the notable bugs we hit while building the Battleship game and how each was resolved.

---

## 1. The enemy fleet stayed visible after the first game
**Symptom:** During the first match the enemy board correctly hid its ships, but after restarting for a second game the enemy ships were revealed on the grid — so you could see exactly where to shoot.

**Cause:** The enemy board's `hideShips` flag was set to `true` when the board was first created, but it got flipped off when the fleet was revealed at the end of a game. The restart path (`Game.start()`) rebuilt the board without re-hiding the ships, so the previous game's "reveal" state carried over into the new game.

**Fix:** Reset `enemyBoard.hideShips = true` at the start of every new game, before the board is rebuilt, so each match starts with the enemy fleet hidden again.

---

## 2. The "P" in the BATTLESHIP wordmark had a flat edge on its bowl
**Symptom:** The curved inner bowl of the "P" rendered with a straight chord across it, while the visually identical "B" looked correct.

**Cause:** A WebKit rendering bug in `-webkit-text-stroke`. On the P's narrow inner curve the stroke self-intersected and closed the loop with a straight line; the B's wider bowls didn't trigger it.

**Fix:** Dropped `-webkit-text-stroke` entirely and rebuilt the dark-red outline + bevel using layered `drop-shadow` filters on the gradient text. Drop-shadows follow the glyph's true alpha shape, so the outline and fill now trace the real letterform curve.

---

## 3. Sonar audio wouldn't start until the music button was toggled
**Symptom:** On the welcome/placement screen, the looping sonar track only began playing after you turned Music off and back on — not on your first interaction with the page.

**Cause:** Browsers block audio autoplay until the user makes a gesture. Our "start on first interaction" hook listened only for `pointerdown`/`keydown`. Safari does **not** accept those as a valid media-unlock gesture — it only honors `click`/`touchend`. The Music toggle happened to be a real `click`, which is why that was the one thing that worked. A secondary issue: the hook removed itself even when a blocked attempt failed, so it never retried.

**Fix:** Added `click` and `touchend` to the unlock listeners, and kept the listener alive until a play attempt actually succeeds (a blocked attempt no longer consumes the hook). The sonar now starts on the very first click anywhere on the page.

---

## 4. White fringe around the transparent logo
**Symptom:** After keying out the logo's white background, faint white speckles remained along the red ribbon edges.

**Cause:** The first cutout only removed pure-white pixels, leaving the anti-aliased pixels where the ribbon had blended into the original white background.

**Fix:** Redid the cutout from the source image: flood-filled the background inward from the edges (so interior detail stayed solid), trimmed the 1px blended halo ring, feathered the alpha for smooth edges, and decontaminated the leftover white tint. Result: clean edges on the dark steel header.

---

## 5. Sunk-ship cells didn't turn red in Prince Mode
**Symptom:** Normally a sunk ship's cells turn light red. In Prince Mode they stayed purple.

**Cause:** A CSS specificity conflict. The Prince-Mode rule `body.prince-mode .cell` (specificity 0-2-1) outranked the `.cell.sunk` rule (0-2-0), so the purple tile always won.

**Fix:** Added a Prince-Mode-specific override, `body.prince-mode .cell.sunk`, with the light-red gradient. Sunk ships now turn red in both themes while the darker hit pegs stay visible on top.

---

## 6. A leftover highlight "box" appeared after rotating a ship
**Symptom:** On the placement screen, after pressing Rotate, a stale block of highlighted cells lingered on the board until you moved the mouse again.

**Cause:** `toggleOrientation()` flipped the orientation but never redrew the placement preview. The old (pre-rotation) highlighted cells stayed lit until the next `mousemove` re-rendered them.

**Fix:** Tracked the last hovered cell and refactored the preview drawing into a single `renderPreview()` method called from both hover **and** rotate. Rotating now immediately redraws the preview in the new orientation — no stale box, no need to wiggle the mouse.

---

## 7. The drag-and-drop ghost ship didn't rotate with `R`
**Symptom:** While dragging a ship onto the board, pressing `R` rotated the highlighted target cells but the floating ship "ghost" that follows the cursor kept its original orientation, so the two disagreed.

**Cause:** The rotate handler updated the placement orientation (which drives the cell highlight) but never re-rendered the drag-ghost element, which had been built once at drag start.

**Fix:** Re-render the drag ghost whenever orientation changes mid-drag, so the floating silhouette and the target-cell highlight always match.

---

## 8. The Prince Mode rain transition fired in both directions
**Symptom:** The purple rain transition was supposed to play only when *entering* Prince Mode, but it also played when switching back to classic mode.

**Cause:** The button's click handler called the rain transition on every toggle, regardless of which way it was switching.

**Fix:** Gated the effect so it only runs when turning Prince Mode **on** (classic → Prince), not on the way back.

---

## 9. Deploy/caching confusion on the enlarged tagline
**Symptom:** A tagline size change "didn't take" when viewing the preview.

**Cause:** Not a code bug — Vercel + browser caching was serving an older build for a short window after the push.

**Fix:** Confirmed the deployed asset actually contained the change, then hard-refreshed. Later refined the tagline to scale relative to the wordmark (spanning exactly from the "A" to the "I" of BATTLESHIP) so its size is locked at every screen width.

---

## 10. The Music and SFX buttons overlapped the logo's red ribbon
**Symptom:** On the battle screen the sound-control buttons sat on top of the logo banner, colliding with the red ribbon graphic instead of sitting clear of it.

**Cause:** The controls were positioned without enough top offset, so at the header's height they overlapped the logo artwork.

**Fix:** Repositioned the Music/SFX controls so they clear the banner, keeping the header artwork unobstructed at every width.

---

## 11. The Prince Mode raindrops rendered as circles, not teardrops
**Symptom:** The first version of the rain transition showed floating circles falling down the screen rather than teardrop-shaped drops.

**Cause:** Only the round, glossy "head" of each drop was opaque; the tapering streak above it was nearly transparent, so the eye only registered the round head — reading as a circle.

**Fix:** Reshaped each drop into a true teardrop — a rounded bulb that tapers to a pointed tail with a faint trailing streak — then tuned the proportions down (an early pass was too fat and looked like "water balloons") so they read as slim drops running down the screen.


---

## Feature Evolution (v1 → current)

Beyond the individual bug fixes above, the game grew substantially from its first version. This is the high-level arc of how it evolved:

- **Core gameplay (v1):** Single-player Battleship vs. an AI — click-to-place fleet, turn-based firing, hit/miss tracking, ship-sunk detection, and win/lose conditions. Static HTML/CSS/JS, no build step.
- **UX & Branding Overhaul:** Initial version of the game had a very simple UX with minimal stylistic choices or additions (e.g. shades of blue with white text and yellow highlights). Through many iterations, reworked the entire visual vocabulary of the game to more closely resemble the 1996 version of the Battleship Board Game by Milton Bradley (wordmark / logo rework, diamond plate steel, board game aesthetic, pegs, sonar, ship outlines for fleet, etc.)
- **Placement UX:** Added drag-and-drop ship placement (from the shipyard *and* the "Your Fleet" tracker), a live placement preview, and mid-drag rotation with `R` — on top of the original click-to-place and Randomize/Clear controls.
- **Audio:** Looping sonar ambience, hit/miss/sink sound effects, win/lose fanfare, and Music/SFX toggles, with a reliable cross-browser autoplay-unlock on first interaction.
- **Prince Mode theme:** A purple alternate theme with its own palette and music to honor the world's greatest musical talent, a button that scrolls to the logo and toggles its own label/colors ("Prince Mode" ↔ red/yellow "Classic Mode"), and a 4-second "Purple Rain" transition that plays only when *entering* Prince Mode.
- **Combat juice:** Explosion burst + screen shake on a hit, water-ripple splash on a miss, and a tilt-and-bubbles sinking effect when a ship goes down.
- **AI difficulties:** Grew from a basic opponent to five tiers — Easy, Medium, Hard, Impossible, and a fair, no-peeking **Devin AI** that uses probability-density targeting (averages ~44 shots to win).
- **Stats & persistence:** Shots / Hits / Hit Rate readout plus a **Win Streak** that persists across refreshes via `localStorage` and resets on a loss.
- **Polish:** Logo wordmark/outline rendering fixes, a transparent logo cutout, responsive tagline scaling, and consistent difficulty-button styling.
