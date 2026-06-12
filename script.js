"use strict";

/* ------------------------------------------------------------------ *
 * Battleship — single player vs. simple AI.
 * Plain HTML/CSS/JS, no dependencies.
 * ------------------------------------------------------------------ */

const BOARD_SIZE = 10;

const SHIP_TYPES = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

const CellState = {
  EMPTY: "empty",
  SHIP: "ship",
  HIT: "hit",
  MISS: "miss",
};

/* Side-profile silhouettes (fill = currentColor so CSS controls the color).
 * Surface warships share one hull scaled by length; the submarine differs. */
const SHIP_SILHOUETTES = {
  surface:
    "M4 24 L110 24 L118 28 L112 32 L10 32 Z " +
    "M28 24 L28 16 L40 16 L43 11 L60 11 L63 16 L72 16 L72 24 Z " +
    "M76 24 L76 18 L92 18 L92 24 Z " +
    "M49 11 L52 4 L55 11 Z",
  sub:
    "M8 28 Q8 21 20 21 L100 21 Q116 21 116 28 Q116 33 100 33 L20 33 Q8 33 8 28 Z " +
    "M52 21 L52 13 L68 13 L68 21 Z " +
    "M58 13 L60 7 L62 13 Z",
};

function shipSilhouetteSVG(ship) {
  const isSub = /submarine/i.test(ship.name);
  const path = isSub ? SHIP_SILHOUETTES.sub : SHIP_SILHOUETTES.surface;
  const width = 26 + ship.size * 16;
  return (
    `<svg class="ship-figure" viewBox="0 0 124 40" width="${width}" height="${Math.round(
      width / 3.1
    )}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">` +
    `<path d="${path}" fill="currentColor" /></svg>`
  );
}

/* ------------------------------------------------------------------ *
 * Audio: background music and sound effects play from bundled audio
 * files; the win/lose fanfare is a short synthesized flourish.
 * ------------------------------------------------------------------ */
class AudioController {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;

    this.music = new Audio("assets/music.mp3");
    this.music.loop = true;
    this.music.volume = 0.45;
    this.music.preload = "auto";

    this.sfxSrc = {
      splash: "assets/splash.wav",
      explosion: "assets/explosion.wav",
    };
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  playSfx(name, volume) {
    if (!this.sfxOn) return;
    const src = this.sfxSrc[name];
    if (!src) return;
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  }

  splash() {
    this.playSfx("splash", 0.7);
  }

  explosion() {
    this.playSfx("explosion", 0.85);
  }

  fanfare(win) {
    if (!this.sfxOn) return;
    this.ensure();
    if (!this.ctx) return;
    const seq = win ? [392, 523, 659, 784] : [392, 311, 262, 196];
    let t = this.ctx.currentTime + 0.02;
    for (const f of seq) {
      const osc = this.ctx.createOscillator();
      osc.type = win ? "triangle" : "sawtooth";
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
      t += 0.18;
    }
  }

  startMusic() {
    if (!this.musicOn) return;
    const p = this.music.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  stopMusic() {
    this.music.pause();
  }

  setMusic(on) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  setSfx(on) {
    this.sfxOn = on;
  }
}

/**
 * A single player's board: ship layout, shot tracking, and DOM grid.
 */
class Board {
  constructor(element, { hideShips }) {
    this.element = element;
    this.hideShips = hideShips;
    this.reset();
    this.buildDom();
  }

  reset() {
    this.grid = createMatrix(BOARD_SIZE, CellState.EMPTY);
    this.shipAt = createMatrix(BOARD_SIZE, null);
    this.ships = [];
    this.cellEls = [];
  }

  buildDom() {
    this.element.innerHTML = "";
    this.element.classList.toggle("enemy", this.hideShips);
    this.shipLayer = document.createElement("div");
    this.shipLayer.className = "ship-layer";
    this.cellEls = createMatrix(BOARD_SIZE, null);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}`);
        this.element.appendChild(cell);
        this.cellEls[r][c] = cell;
      }
    }
    this.element.appendChild(this.shipLayer);
  }

  canPlace(row, col, size, horizontal) {
    for (let i = 0; i < size; i++) {
      const r = row + (horizontal ? 0 : i);
      const c = col + (horizontal ? i : 0);
      if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
      if (this.grid[r][c] !== CellState.EMPTY) return false;
    }
    return true;
  }

  placeShip(row, col, type, horizontal) {
    const ship = {
      name: type.name,
      size: type.size,
      hits: 0,
      cells: [],
      isSunk: false,
      horizontal,
    };
    for (let i = 0; i < type.size; i++) {
      const r = row + (horizontal ? 0 : i);
      const c = col + (horizontal ? i : 0);
      this.grid[r][c] = CellState.SHIP;
      this.shipAt[r][c] = ship;
      ship.cells.push({ row: r, col: c });
    }
    this.ships.push(ship);
    return ship;
  }

  /** Randomly place the full standard fleet without overlaps. */
  placeFleetRandomly() {
    for (const type of SHIP_TYPES) this.placeOneRandomly(type);
  }

  placeOneRandomly(type) {
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() < 0.5;
      const maxRow = horizontal ? BOARD_SIZE : BOARD_SIZE - type.size;
      const maxCol = horizontal ? BOARD_SIZE - type.size : BOARD_SIZE;
      const row = randomInt(maxRow);
      const col = randomInt(maxCol);
      if (this.canPlace(row, col, type.size, horizontal)) {
        this.placeShip(row, col, type, horizontal);
        placed = true;
      }
    }
  }

  removeShip(ship) {
    for (const { row, col } of ship.cells) {
      this.grid[row][col] = CellState.EMPTY;
      this.shipAt[row][col] = null;
    }
    this.ships = this.ships.filter((s) => s !== ship);
  }

  clearShips() {
    for (const ship of [...this.ships]) this.removeShip(ship);
  }

  /**
   * Apply a shot at (row, col).
   * Returns { result: 'hit'|'miss', ship, alreadyFired }.
   */
  receiveShot(row, col) {
    const state = this.grid[row][col];
    if (state === CellState.HIT || state === CellState.MISS) {
      return { result: state, alreadyFired: true, ship: null };
    }
    if (state === CellState.SHIP) {
      this.grid[row][col] = CellState.HIT;
      const ship = this.shipAt[row][col];
      ship.hits += 1;
      if (ship.hits >= ship.size) ship.isSunk = true;
      return { result: "hit", alreadyFired: false, ship };
    }
    this.grid[row][col] = CellState.MISS;
    return { result: "miss", alreadyFired: false, ship: null };
  }

  allShipsSunk() {
    return this.ships.length > 0 && this.ships.every((ship) => ship.isSunk);
  }

  /** Re-render markers on every cell based on current state. */
  render() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.cellEls[r][c];
        const state = this.grid[r][c];
        const ship = this.shipAt[r][c];
        cell.classList.remove("hit", "miss", "sunk", "fired", "ship-cell");

        if (state === CellState.HIT) {
          cell.classList.add("fired");
          cell.classList.add(ship && ship.isSunk ? "sunk" : "hit");
        } else if (state === CellState.MISS) {
          cell.classList.add("miss", "fired");
        } else if (state === CellState.SHIP && !this.hideShips) {
          cell.classList.add("ship-cell");
        }
      }
    }
    this.renderShips();
  }

  /** Draw ship graphics as overlays positioned over the spanned cells. */
  renderShips() {
    if (!this.shipLayer) return;
    this.shipLayer.innerHTML = "";
    if (this.hideShips) return;
    for (const ship of this.ships) {
      this.shipLayer.appendChild(this.makeShipGraphic(ship));
    }
  }

  makeShipGraphic(ship) {
    const first = ship.cells[0];
    const last = ship.cells[ship.cells.length - 1];
    const firstEl = this.cellEls[first.row][first.col];
    const lastEl = this.cellEls[last.row][last.col];
    const el = document.createElement("div");
    el.className = "ship-graphic" + (ship.horizontal ? " horizontal" : " vertical");
    if (ship.isSunk) el.classList.add("sunk");
    el.dataset.size = String(ship.size);
    el.style.left = firstEl.offsetLeft + "px";
    el.style.top = firstEl.offsetTop + "px";
    el.style.width = lastEl.offsetLeft + lastEl.offsetWidth - firstEl.offsetLeft + "px";
    el.style.height = lastEl.offsetTop + lastEl.offsetHeight - firstEl.offsetTop + "px";
    return el;
  }
}

/**
 * Simple AI: fires at random cells it has not fired at yet.
 */
class AiPlayer {
  constructor() {
    this.resetTargets();
  }

  resetTargets() {
    this.available = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.available.push({ row: r, col: c });
      }
    }
  }

  nextTarget() {
    if (this.available.length === 0) return null;
    const index = randomInt(this.available.length);
    return this.available.splice(index, 1)[0];
  }
}

const Phase = { PLACE: "place", BATTLE: "battle", OVER: "over" };

class Game {
  constructor() {
    this.audio = new AudioController();
    this.enemyBoard = new Board(document.getElementById("enemy-board"), {
      hideShips: true,
    });
    this.playerBoard = new Board(document.getElementById("player-board"), {
      hideShips: false,
    });
    this.ai = new AiPlayer();

    this.statusEl = document.getElementById("status");
    this.enemyFleetEl = document.getElementById("enemy-fleet");
    this.playerFleetEl = document.getElementById("player-fleet");
    this.overlay = document.getElementById("overlay");
    this.overlayTitle = document.getElementById("overlay-title");
    this.overlayMessage = document.getElementById("overlay-message");
    this.otter = document.getElementById("otter");
    this.otterImg = document.getElementById("otter-img");
    this.shipyardEl = document.getElementById("shipyard");
    this.statShots = document.getElementById("stat-shots");
    this.statHits = document.getElementById("stat-hits");
    this.statRate = document.getElementById("stat-rate");
    this.enemyScore = document.getElementById("enemy-score");

    this.busy = false;
    this.phase = Phase.PLACE;
    this.shots = 0;
    this.hits = 0;

    // Placement state
    this.placement = { horizontal: true, selected: null, remaining: [] };

    this.bindEvents();
    this.start();
  }

  bindEvents() {
    this.enemyBoard.element.addEventListener("click", (e) => this.onEnemyClick(e));

    this.playerBoard.element.addEventListener("click", (e) => this.onPlayerBoardClick(e));
    this.playerBoard.element.addEventListener("mousemove", (e) => this.onPlayerHover(e));
    this.playerBoard.element.addEventListener("mouseleave", () => this.clearPreview());

    document.getElementById("restart").addEventListener("click", () => this.start());
    document.getElementById("play-again").addEventListener("click", () => this.start());
    document.getElementById("rotate").addEventListener("click", () => this.toggleOrientation());
    document.getElementById("randomize").addEventListener("click", () => this.randomizePlacement());
    document.getElementById("clear").addEventListener("click", () => this.clearPlacement());
    document.getElementById("start-battle").addEventListener("click", () => this.startBattle());

    document.addEventListener("keydown", (e) => {
      if ((e.key === "r" || e.key === "R") && this.phase === Phase.PLACE) {
        this.toggleOrientation();
      }
    });

    const music = document.getElementById("toggle-music");
    music.addEventListener("click", () => {
      const on = music.getAttribute("aria-pressed") !== "true";
      music.setAttribute("aria-pressed", String(on));
      music.innerHTML = on ? "&#9835; Music: On" : "&#9835; Music: Off";
      this.audio.resume();
      this.audio.setMusic(on);
    });
    const sfx = document.getElementById("toggle-sfx");
    sfx.addEventListener("click", () => {
      const on = sfx.getAttribute("aria-pressed") !== "true";
      sfx.setAttribute("aria-pressed", String(on));
      sfx.innerHTML = on ? "&#128266; SFX: On" : "&#128264; SFX: Off";
      this.audio.setSfx(on);
    });

    window.addEventListener("resize", () => {
      this.enemyBoard.renderShips();
      this.playerBoard.renderShips();
    });
  }

  setPhase(phase) {
    this.phase = phase;
    document.body.classList.remove("phase-place", "phase-battle", "phase-over");
    document.body.classList.add("phase-" + phase);
  }

  start() {
    this.enemyBoard.hideShips = true;
    this.enemyBoard.reset();
    this.enemyBoard.buildDom();
    this.playerBoard.reset();
    this.playerBoard.buildDom();
    this.ai.resetTargets();
    this.enemyBoard.placeFleetRandomly();

    this.busy = false;
    this.shots = 0;
    this.hits = 0;
    this.updateStats();

    this.placement.horizontal = true;
    this.placement.remaining = SHIP_TYPES.map((t) => ({ ...t }));
    this.placement.selected = this.placement.remaining[0] || null;

    this.overlay.classList.add("hidden");
    this.setPhase(Phase.PLACE);
    this.setStatus("Position your fleet — click a ship, then click your grid.");
    this.renderShipyard();
    this.renderAll();
  }

  /* ---------------- Placement phase ---------------- */
  renderShipyard() {
    this.shipyardEl.innerHTML = "";
    for (const type of this.placement.remaining) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "shipyard-item";
      if (this.placement.selected && this.placement.selected.name === type.name) {
        item.classList.add("selected");
      }
      const preview = document.createElement("span");
      preview.className = "ship-graphic horizontal";
      preview.dataset.size = String(type.size);
      preview.style.width = type.size * 26 + "px";
      preview.style.height = "22px";
      const label = document.createElement("span");
      label.className = "shipyard-label";
      label.textContent = `${type.name} (${type.size})`;
      item.appendChild(preview);
      item.appendChild(label);
      item.addEventListener("click", () => {
        this.placement.selected = type;
        this.renderShipyard();
      });
      this.shipyardEl.appendChild(item);
    }
    const allPlaced = this.placement.remaining.length === 0;
    document.getElementById("start-battle").disabled = !allPlaced;
    if (allPlaced) {
      this.shipyardEl.innerHTML =
        '<p class="shipyard-done">Fleet ready, Admiral. Press <em>Start Battle</em>.</p>';
    }
  }

  toggleOrientation() {
    this.placement.horizontal = !this.placement.horizontal;
    this.setStatus(
      "Orientation: " + (this.placement.horizontal ? "horizontal" : "vertical")
    );
  }

  cellFromEvent(event) {
    const cell = event.target.closest(".cell");
    if (!cell) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  }

  onPlayerHover(event) {
    if (this.phase !== Phase.PLACE || !this.placement.selected) return;
    const pos = this.cellFromEvent(event);
    this.clearPreview();
    if (!pos) return;
    const { size } = this.placement.selected;
    const h = this.placement.horizontal;
    const ok = this.playerBoard.canPlace(pos.row, pos.col, size, h);
    for (let i = 0; i < size; i++) {
      const r = pos.row + (h ? 0 : i);
      const c = pos.col + (h ? i : 0);
      if (r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
      const el = this.playerBoard.cellEls[r][c];
      el.classList.add(ok ? "preview-ok" : "preview-bad");
    }
  }

  clearPreview() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.playerBoard.cellEls[r][c].classList.remove("preview-ok", "preview-bad");
      }
    }
  }

  onPlayerBoardClick(event) {
    if (this.phase !== Phase.PLACE || !this.placement.selected) return;
    const pos = this.cellFromEvent(event);
    if (!pos) return;
    const type = this.placement.selected;
    const h = this.placement.horizontal;
    if (!this.playerBoard.canPlace(pos.row, pos.col, type.size, h)) {
      this.setStatus("Can't place there — ships can't overlap or hang off the grid.");
      return;
    }
    this.audio.resume();
    this.playerBoard.placeShip(pos.row, pos.col, type, h);
    this.placement.remaining = this.placement.remaining.filter(
      (t) => t.name !== type.name
    );
    this.placement.selected = this.placement.remaining[0] || null;
    this.clearPreview();
    this.renderShipyard();
    this.playerBoard.render();
    if (this.placement.remaining.length === 0) {
      this.setStatus("Fleet positioned. Press Start Battle when ready.");
    }
  }

  randomizePlacement() {
    this.playerBoard.clearShips();
    this.playerBoard.placeFleetRandomly();
    this.placement.remaining = [];
    this.placement.selected = null;
    this.clearPreview();
    this.renderShipyard();
    this.playerBoard.render();
    this.setStatus("Fleet positioned at random. Press Start Battle when ready.");
  }

  clearPlacement() {
    this.playerBoard.clearShips();
    this.placement.remaining = SHIP_TYPES.map((t) => ({ ...t }));
    this.placement.selected = this.placement.remaining[0];
    this.clearPreview();
    this.renderShipyard();
    this.playerBoard.render();
    this.setStatus("Board cleared — position your fleet.");
  }

  startBattle() {
    if (this.placement.remaining.length > 0) return;
    this.audio.resume();
    this.audio.startMusic();
    this.setPhase(Phase.BATTLE);
    this.setStatus("Your turn — click a cell on the enemy waters to fire.");
    this.renderAll();
  }

  /* ---------------- Battle phase ---------------- */
  onEnemyClick(event) {
    if (this.phase !== Phase.BATTLE || this.busy) return;
    const pos = this.cellFromEvent(event);
    if (!pos) return;

    const shot = this.enemyBoard.receiveShot(pos.row, pos.col);
    if (shot.alreadyFired) return;

    this.shots += 1;
    if (shot.result === "hit") this.hits += 1;
    this.updateStats();

    const cell = this.enemyBoard.cellEls[pos.row][pos.col];
    this.playEffect(cell, shot.result);
    this.enemyBoard.render();
    this.renderFleets();

    if (shot.result === "hit") {
      this.setStatus(
        shot.ship.isSunk ? `Hit! You sunk the enemy ${shot.ship.name}.` : "Hit!"
      );
    } else {
      this.setStatus("Miss.");
    }

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    this.busy = true;
    setTimeout(() => this.aiTurn(), 700);
  }

  aiTurn() {
    if (this.phase !== Phase.BATTLE) return;
    const target = this.ai.nextTarget();
    if (!target) {
      this.busy = false;
      return;
    }

    const shot = this.playerBoard.receiveShot(target.row, target.col);
    const cell = this.playerBoard.cellEls[target.row][target.col];
    this.playEffect(cell, shot.result);
    this.playerBoard.render();
    this.renderFleets();

    if (shot.result === "hit") {
      this.setStatus(
        shot.ship.isSunk
          ? `Enemy hit and sank your ${shot.ship.name}!`
          : "Enemy scored a hit on your fleet!"
      );
    } else {
      this.setStatus("Enemy missed. Your turn — fire away.");
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame(false);
      return;
    }
    this.busy = false;
  }

  playEffect(cell, result) {
    const fx = document.createElement("span");
    fx.className = result === "hit" ? "fx-explosion" : "fx-splash";
    cell.appendChild(fx);
    setTimeout(() => fx.remove(), 800);
    if (result === "hit") this.audio.explosion();
    else this.audio.splash();
  }

  updateStats() {
    this.statShots.textContent = String(this.shots);
    this.statHits.textContent = String(this.hits);
    this.statRate.innerHTML =
      this.shots === 0 ? "&mdash;" : Math.round((this.hits / this.shots) * 100) + "%";
  }

  endGame(playerWon) {
    this.setPhase(Phase.OVER);
    this.busy = false;
    this.enemyBoard.hideShips = false;
    this.enemyBoard.render();
    this.renderFleets();

    this.audio.stopMusic();
    this.audio.fanfare(playerWon);

    this.otter.classList.toggle("win", playerWon);
    this.otter.classList.toggle("lose", !playerWon);
    this.otterImg.src = playerWon ? "assets/otter-win.png" : "assets/otter-lose.png";
    this.overlayTitle.textContent = playerWon ? "You Win!" : "You Lost!";
    this.overlayMessage.textContent = playerWon
      ? "Admiral Devin salutes you — the enemy fleet is sunk!"
      : "Admiral Devin is laughing — your fleet went down.";
    this.overlay.classList.remove("hidden");
    this.setStatus(playerWon ? "You win!" : "You lose!");
  }

  renderAll() {
    this.enemyBoard.render();
    this.playerBoard.render();
    this.renderFleets();
  }

  renderFleets() {
    this.renderFleet(this.enemyFleetEl, this.enemyBoard);
    this.renderFleet(this.playerFleetEl, this.playerBoard);
    this.updateScore();
  }

  renderFleet(listEl, board) {
    listEl.innerHTML = "";
    const ships = board.ships.length
      ? board.ships
      : SHIP_TYPES.map((t) => ({ ...t, hits: 0, isSunk: false }));
    for (const ship of ships) {
      const li = document.createElement("li");
      li.setAttribute("aria-label", ship.isSunk ? `${ship.name} sunk` : ship.name);
      if (ship.isSunk) li.classList.add("sunk-ship");

      const fig = document.createElement("span");
      fig.className = "ship-fig-wrap";
      fig.innerHTML = shipSilhouetteSVG(ship);
      if (ship.isSunk) {
        const sunk = document.createElement("span");
        sunk.className = "sunk-label";
        sunk.textContent = "SUNK";
        fig.appendChild(sunk);
      }

      li.appendChild(fig);
      listEl.appendChild(li);
    }
  }

  updateScore() {
    if (!this.enemyScore) return;
    const sunk = this.enemyBoard.ships.filter((s) => s.isSunk).length;
    const score = this.hits * 10 + sunk * 50;
    this.enemyScore.textContent = String(score);
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }
}

function createMatrix(size, fill) {
  const matrix = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(typeof fill === "function" ? fill() : fill);
    }
    matrix.push(row);
  }
  return matrix;
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

document.addEventListener("DOMContentLoaded", () => {
  new Game();
});
