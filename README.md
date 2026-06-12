# Battleship

A single-player Battleship game playable in the browser. You play against a
simple AI opponent. Built with plain HTML, CSS, and JavaScript — no frameworks
and no backend, so it can be deployed as a static site.

## How to play

1. Open `index.html` in a browser (or visit the deployed site).
2. **Position your fleet:** click a ship in the shipyard, then click your grid
   to drop it. Press **R** (or **Rotate**) to switch between horizontal and
   vertical. Use **Randomize** to auto-place or **Clear** to start over.
3. Press **Start Battle** once all five ships are placed.
4. The boards are stacked vertically: **Enemy Waters** on top (ships hidden),
   **Your Fleet** below.
5. Click a cell on the enemy grid to fire — a splash marks a miss, an explosion
   marks a hit, each with its own sound effect.
6. After your shot, the AI automatically fires back at your fleet.
7. Live stats (shots, hits, hit rate) and the fleet roster update as you play;
   a ship's silhouette fills in red as it takes hits and reads **SUNK** when
   destroyed.
8. Sink the entire enemy fleet to win (Admiral Devin salutes you) or lose your
   whole fleet (Admiral Devin laughs). Use **Play Again** / **Restart Game** to
   start a fresh match.

## Audio

All sound — the background march, splashes, explosions, and win/lose
fanfares — is synthesized in-browser with the Web Audio API, so there are no
audio files to ship. Use the **Music** and **SFX** toggles in the header to mute
either one.

## Fleet

| Ship       | Size |
| ---------- | ---- |
| Carrier    | 5    |
| Battleship | 4    |
| Cruiser    | 3    |
| Submarine  | 3    |
| Destroyer  | 2    |

## Files

- `index.html` — markup and layout
- `style.css` — styling
- `script.js` — game logic, random ship placement, and AI targeting

## Running locally

It's a static site, so just open `index.html`. To serve it over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

Deploy the folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare
Pages, etc.). There is no build step.
