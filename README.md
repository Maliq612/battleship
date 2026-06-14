# Battleship

A single-player Battleship game playable in the browser, built with plain HTML,
CSS, and JavaScript — no frameworks and no backend, so it deploys as a static
site.

**▶ Play it live:** https://battleship-indol.vercel.app/

## Features

- **Five AI difficulty tiers** — Easy, Medium, Hard, Impossible, and a fair,
  no-peeking **Devin AI** that uses probability-density targeting (averages
  ~44 shots to win).
- **Flexible ship placement** — click-to-place, **drag-and-drop** (from the
  shipyard or the "Your Fleet" tracker), mid-drag rotation with **R**, plus
  **Randomize** and **Clear**.
- **Combat feedback** — explosion burst + screen shake on a hit, a water-ripple
  splash on a miss, and a tilt-and-bubbles sinking effect when a ship goes down.
- **Live stats** — Shots, Hits, Hit Rate, and a **Win Streak** that persists
  across page refreshes (via `localStorage`) and resets on a loss.
- **Prince Mode** — a purple alternate theme with its own palette and music,
  toggled by a button that scrolls to the logo and triggers a "Purple Rain"
  transition.
- **Sound** — background music, sonar ambience, hit/miss/sink effects, and
  win/lose fanfares, with **Music** and **SFX** toggles in the header.

## How to play

1. Open the [live site](https://battleship-indol.vercel.app/) (or `index.html`
   locally).
2. **Position your fleet:** click a ship in the shipyard then click your grid to
   drop it, or drag it onto the grid. Press **R** (or **Rotate**) to switch
   between horizontal and vertical. Use **Randomize** to auto-place or **Clear**
   to start over.
3. Pick an **Enemy difficulty** (Easy → Devin AI).
4. Press **Start Battle** once all five ships are placed.
5. The boards are stacked vertically: **Enemy Waters** on top (ships hidden),
   **Your Fleet** below.
6. Click a cell on the enemy grid to fire — a splash marks a miss, an explosion
   marks a hit, each with its own sound effect. The AI then fires back.
7. Sink the entire enemy fleet to win (Admiral Devin salutes you) or lose your
   whole fleet (Admiral Devin laughs). Use **Play Again** / **Restart Game** to
   start a fresh match.

## Fleet

| Ship       | Size |
| ---------- | ---- |
| Carrier    | 5    |
| Battleship | 4    |
| Cruiser    | 3    |
| Submarine  | 3    |
| Destroyer  | 2    |

## AI difficulty

| Tier         | Behavior |
| ------------ | -------- |
| Easy         | Fires at random untried cells. |
| Medium       | Random search, then hunts adjacent cells after a hit. |
| Hard         | Hunts after hits and occasionally peeks at ship locations. |
| Impossible   | Aggressively steers shots toward real ship segments. |
| **Devin AI** | Fair and never peeks — builds a probability-density map of where the remaining ships can fit and fires at the most likely cell. |

## Project structure

- `index.html` — markup and layout
- `style.css` — styling, theming (incl. Prince Mode), and animations
- `script.js` — game logic, ship placement, AI targeting, audio, and effects
- `assets/` — images (logos, mascots, textures) and audio (`.mp3` / `.wav`)

## Running locally

It's a static site, so just open `index.html`. To serve it over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

Deploy the folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare
Pages, etc.). There is no build step. The live site is hosted on Vercel and
auto-deploys from `main`.

## Bug report

A short writeup of bugs found during development and how they were fixed lives in
[`BUGS.md`](./BUGS.md).
