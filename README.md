# Battleship

A single-player Battleship game playable in the browser. You play against a
simple AI opponent. Built with plain HTML, CSS, and JavaScript — no frameworks
and no backend, so it can be deployed as a static site.

## How to play

1. Open `index.html` in a browser (or visit the deployed site).
2. The top grid is **Enemy Waters** (ships hidden); the bottom grid is **Your
   Fleet**.
3. Click a cell on the enemy grid to fire. Red = hit, gray = miss.
4. After your shot, the AI automatically fires back at your fleet.
5. Sunk ships are tracked in the fleet list under each board.
6. Sink the entire enemy fleet to win. Lose your whole fleet and you lose.
7. Use **Play Again** / **Restart Game** to start a fresh match.

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
