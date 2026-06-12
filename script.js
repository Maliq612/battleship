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
    // grid[r][c] holds a CellState; shipAt[r][c] references the ship object.
    this.grid = createMatrix(BOARD_SIZE, CellState.EMPTY);
    this.shipAt = createMatrix(BOARD_SIZE, null);
    this.ships = [];
    this.cellEls = [];
  }

  buildDom() {
    this.element.innerHTML = "";
    this.element.classList.toggle("enemy", this.hideShips);
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
  }

  /** Randomly place the full standard fleet without overlaps. */
  placeFleetRandomly() {
    for (const type of SHIP_TYPES) {
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
    };
    for (let i = 0; i < type.size; i++) {
      const r = row + (horizontal ? 0 : i);
      const c = col + (horizontal ? i : 0);
      this.grid[r][c] = CellState.SHIP;
      this.shipAt[r][c] = ship;
      ship.cells.push({ row: r, col: c });
    }
    this.ships.push(ship);
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
    return this.ships.every((ship) => ship.isSunk);
  }

  /** Re-render every cell based on current state. */
  render() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.cellEls[r][c];
        const state = this.grid[r][c];
        const ship = this.shipAt[r][c];
        cell.classList.remove("ship", "hit", "miss", "sunk", "fired");

        if (state === CellState.HIT) {
          cell.classList.add("fired");
          cell.classList.add(ship && ship.isSunk ? "sunk" : "hit");
        } else if (state === CellState.MISS) {
          cell.classList.add("miss", "fired");
        } else if (state === CellState.SHIP && !this.hideShips) {
          cell.classList.add("ship");
        }
      }
    }
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

  /** Pick (and remove) a random un-fired cell. */
  nextTarget() {
    if (this.available.length === 0) return null;
    const index = randomInt(this.available.length);
    return this.available.splice(index, 1)[0];
  }
}

class Game {
  constructor() {
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

    this.busy = false;
    this.gameOver = false;

    this.enemyBoard.element.addEventListener("click", (e) =>
      this.onEnemyClick(e)
    );
    document
      .getElementById("restart")
      .addEventListener("click", () => this.start());
    document
      .getElementById("play-again")
      .addEventListener("click", () => this.start());

    this.start();
  }

  start() {
    this.enemyBoard.hideShips = true;
    this.enemyBoard.reset();
    this.enemyBoard.buildDom();
    this.playerBoard.reset();
    this.playerBoard.buildDom();
    this.ai.resetTargets();

    this.enemyBoard.placeFleetRandomly();
    this.playerBoard.placeFleetRandomly();

    this.busy = false;
    this.gameOver = false;

    this.overlay.classList.add("hidden");
    this.setStatus("Your turn — click a cell on the enemy waters to fire.");
    this.renderAll();
  }

  onEnemyClick(event) {
    if (this.gameOver || this.busy) return;
    const cell = event.target.closest(".cell");
    if (!cell) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const shot = this.enemyBoard.receiveShot(row, col);
    if (shot.alreadyFired) return;

    this.enemyBoard.render();
    this.renderFleets();

    if (shot.result === "hit") {
      if (shot.ship.isSunk) {
        this.setStatus(`Hit! You sunk the enemy ${shot.ship.name}.`);
      } else {
        this.setStatus("Hit!");
      }
    } else {
      this.setStatus("Miss.");
    }

    if (this.enemyBoard.allShipsSunk()) {
      this.endGame(true);
      return;
    }

    // Hand the turn to the AI after a short pause for readability.
    this.busy = true;
    setTimeout(() => this.aiTurn(), 650);
  }

  aiTurn() {
    if (this.gameOver) return;
    const target = this.ai.nextTarget();
    if (!target) {
      this.busy = false;
      return;
    }

    const shot = this.playerBoard.receiveShot(target.row, target.col);
    this.playerBoard.render();
    this.renderFleets();

    if (shot.result === "hit") {
      if (shot.ship.isSunk) {
        this.setStatus(`Enemy hit and sank your ${shot.ship.name}!`);
      } else {
        this.setStatus("Enemy scored a hit on your fleet!");
      }
    } else {
      this.setStatus("Enemy missed. Your turn — fire away.");
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame(false);
      return;
    }

    this.busy = false;
  }

  endGame(playerWon) {
    this.gameOver = true;
    this.busy = false;
    // Reveal the enemy fleet at the end of the game.
    this.enemyBoard.hideShips = false;
    this.enemyBoard.render();
    this.renderFleets();

    this.overlayTitle.textContent = playerWon ? "Victory!" : "Defeat";
    this.overlayMessage.textContent = playerWon
      ? "You sank the entire enemy fleet. Well played, Admiral!"
      : "Your fleet has been destroyed. Better luck next time.";
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
  }

  renderFleet(listEl, board) {
    listEl.innerHTML = "";
    for (const ship of board.ships) {
      const li = document.createElement("li");
      if (ship.isSunk) li.classList.add("sunk-ship");
      const name = document.createElement("span");
      name.textContent = `${ship.name} (${ship.size})`;
      const pegs = document.createElement("span");
      pegs.className = "pegs";
      pegs.textContent = ship.isSunk
        ? "SUNK"
        : "●".repeat(ship.hits) + "○".repeat(ship.size - ship.hits);
      li.appendChild(name);
      li.appendChild(pegs);
      listEl.appendChild(li);
    }
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
