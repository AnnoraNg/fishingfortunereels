/**
 * game.js — Fishing Fortune Reels
 * 5-reel × 3-row fishing-themed slot machine
 *
 * Reel animation uses a real DOM strip approach:
 *  - Each reel column contains a .reel-strip div with N symbol cells
 *  - requestAnimationFrame scrolls the strip downward (translateY increases)
 *  - When the strip scrolls past one cell-height, the bottom cell is recycled
 *    to the top with a new random symbol (keeping the strip appearing infinite)
 *  - On stop: final symbols are placed in the top 3 cells and the strip
 *    eases into translateY = 0
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Demo mode = a fixed, looping script of showcase wins (big/mega/massive,
  // Free Spins, Hold & Spin) so every feature is visible fast. Off by
  // default: visitors get the real weighted RNG unless they switch to DEMO.
  demoMode : false,

  // Free coins offered when the balance can't cover the smallest bet
  refillAmount : 5_000_000,

  startingBalance : 15_000_000,
  betLevels       : [10_000, 20_000, 50_000, 100_000, 200_000, 500_000],
  defaultBetIndex : 1,

  reels       : 5,
  rows        : 3,

  // Strip scroll speed in "cells per second"
  reelSpeed   : 14,       // cells/s during spin (~87ms per symbol at 14/s)

  // Stagger: each reel stops this many ms later than the previous
  reelStagger : 300,
  // Total spin time for the LAST reel to stop (ms)
  lastReelStop: 2800,

  // Extra cells kept above & below the visible window during spin
  stripExtra  : 6,

  // ── Math model (tuned by simulation, ~95% RTP in REAL mode) ──────────
  //   Base lines + scatter ≈ 69% · Free Spins ≈ 12% · Hold & Spin ≈ 15%
  //   Scatter trigger ≈ 1 in 160 spins · Hold & Spin trigger ≈ 1 in 240 spins
  freeSpins: {
    multiplier: 2,                 // applies to all wins during Free Spins
    scatter3  : { spins: 8  },
    scatter4  : { spins: 12 },
    scatter5  : { spins: 15 },
  },
  scatterPays: { 3: 2, 4: 5, 5: 20 },   // × bet, paid anywhere

  // "Buy Feature" — instantly purchase Free Spins instead of landing Scatters.
  // Priced from the simulated value of 10 Free Spins (~22× bet) so the
  // purchase returns ~96% — in line with the base game.
  buyFreeSpins: {
    multiplier : 23,   // cost = current bet × 23
    spins      : 10,   // fixed number of Free Spins granted per purchase
  },

  // ── Hold & Spin jackpot feature ─────────────────────────────────────────
  // 6+ Bonus Coins anywhere (base game only) → coins lock, everything else
  // clears, and the empty cells respin. Each new coin resets respins to 3.
  // Final prize = sum of coin values + the highest jackpot reached by fill.
  holdSpin: {
    trigger     : 6,
    respins     : 3,
    landChance  : 0.055,  // per empty cell, per respin (REAL mode)
    demoLandChance: 0.12, // boosted in DEMO mode so the showcase reaches a jackpot
    // [multiplier of bet, relative weight]
    coinValues  : [[1,30],[2,25],[3,18],[5,12],[8,8],[10,5],[15,2]],
    // Checked highest-first; only the highest jackpot reached is paid.
    jackpots    : [
      { key:'grand', label:'GRAND', fill:15, mult:500 },
      { key:'major', label:'MAJOR', fill:14, mult:100 },
      { key:'minor', label:'MINOR', fill:12, mult:25  },
      { key:'mini',  label:'MINI',  fill:10, mult:10  },
    ],
    // Progressive growth: each jackpot creeps up from its seed (mult × bet)
    // by this fraction per second, capped, and resets to seed when won.
    growthPerSec: 0.0002,
    growthCap   : 0.25,
  },
};

// ── Saved progress (per browser) ─────────────────────────────────────────
// Balance, bet, speed, mode, avatar and frame style survive a reload.
// Storage can be unavailable (private mode, blocked site data) — every
// access is wrapped so the game simply starts fresh in that case.
const SAVE_KEY = 'ffr.save.v1';
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function writeSave(patch) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...loadSave(), ...patch })); } catch {}
}
const SAVED = loadSave();
if (typeof SAVED.demoMode === 'boolean') CONFIG.demoMode = SAVED.demoMode;

// Bonus coin art (320px web copy of the 1024px source art)
const BONUS_COIN_IMG = 'assets/bonus_coin_320.webp';

// ── Symbols ─────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id:'small_fish',         label:'Small Fish',     img:'assets/small_fish.webp',         weight:22,  payouts:{3:1.6, 4:4.8,  5:9.6 } },
  { id:'crab',               label:'Crab',           img:'assets/crab.webp',               weight:18,  payouts:{3:2,   4:5.6,  5:12  } },
  { id:'anchor',             label:'Anchor',         img:'assets/anchor.webp',             weight:16,  payouts:{3:2.4, 4:6.4,  5:14.4} },
  { id:'big_fish',           label:'Big Fish',       img:'assets/big_fish.webp',           weight:14,  payouts:{3:3.2, 4:8,    5:20  } },
  { id:'pearl_shell',        label:'Pearl Shell',    img:'assets/pearl_shell.webp',        weight:11,  payouts:{3:4,   4:10.4, 5:24  } },
  { id:'fishing_hook',       label:'Fishing Hook',   img:'assets/fishing_hook.webp',       weight:9,   payouts:{3:4.8, 4:12,   5:32  } },
  { id:'octopus',            label:'Octopus',        img:'assets/octopus.webp',            weight:5,   payouts:{3:6.4, 4:20,   5:48  } },
  { id:'treasure_chest',     label:'Treasure Chest', img:'assets/treasure_chest.webp',     weight:3,   payouts:{3:12,  4:40,   5:96  } },
  { id:'wild_golden_net',    label:'Wild',           img:'assets/wild_golden_net.webp',    weight:1.5, payouts:null, isWild:true    },
  { id:'scatter_lucky_lure', label:'Scatter',        img:'assets/scatter_lucky_lure.webp', weight:3,   payouts:null, isScatter:true },
  // Bonus Coin — base game only (removed from the Free Spins pool)
  { id:'bonus_coin',         label:'Bonus Coin',     img:BONUS_COIN_IMG,                  weight:13,  payouts:null, isCoin:true    },
];

// Two weighted pools: base game (with Bonus Coins) and Free Spins (without)
const SYMBOL_POOL = [], SYMBOL_POOL_FS = [];
SYMBOLS.forEach(s => {
  const n = Math.round(s.weight * 10);
  for (let i = 0; i < n; i++) {
    SYMBOL_POOL.push(s.id);
    if (!s.isCoin) SYMBOL_POOL_FS.push(s.id);
  }
});


const SYM_BY_ID = {};
SYMBOLS.forEach(s => SYM_BY_ID[s.id] = s);

// ── Paylines ─────────────────────────────────────────────────────────────────
const PAYLINES = [
  [1,1,1,1,1],  // 1  Middle row
  [0,0,0,0,0],  // 2  Top row
  [2,2,2,2,2],  // 3  Bottom row
  [0,1,2,1,0],  // 4  V shape
  [2,1,0,1,2],  // 5  Inverted V
  [0,0,1,0,0],  // 6  Top-Top-Mid-Top-Top
  [2,2,1,2,2],  // 7  Bottom-Bottom-Mid-Bottom-Bottom
  [0,0,1,2,2],  // 8  Top-Top-Mid-Bot-Bot
  [2,2,1,0,0],  // 9  Bot-Bot-Mid-Top-Top
  [1,0,1,2,1],  // 10 Mid-Top-Mid-Bot-Mid
];

// ═══════════════════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════════════════

// Speed levels: multiplier applied to reel speed / stagger / stop time
const SPEED_LEVELS = [
  { label: '⚡ ×1', mult: 1   },
  { label: '⚡ ×2', mult: 2   },
  { label: '⚡ ×4', mult: 4   },
  { label: '⚡ ×8', mult: 8   },
];

const state = {
  balance    : CONFIG.startingBalance,
  betIndex   : CONFIG.defaultBetIndex,
  freeSpins  : 0,
  spinning   : false,
  speedIndex : 0,   // index into SPEED_LEVELS
  sessionWin : 0,   // accumulated total wins this session (displayed in WIN cell)
  grid      : [],   // [col][row] = symbolId  (set after spin stops)
  lastWin   : 0,
  winLines  : [],
  winCells  : new Set(),
  spinCount : 0,    // tracks total spins (all spins, incl. free)
  scriptCount: 0,   // paid base-game spins only — drives the demo script
  coinMults : [],   // [col][row] = Bonus Coin multiplier (null if not a coin)
  inHoldSpin: false,
  ready     : false,  // true once the loading screen has finished
  fsActive  : false,  // inside a Free Spins round (natural or bought)
  fsTotal   : 0,      // total won during the current Free Spins round
  fsPlayed  : 0,      // free spins played in the current round
  fsPendingSummary: false,
};

function saveProgress() {
  writeSave({
    balance   : state.balance,
    betIndex  : state.betIndex,
    sessionWin: state.sessionWin,
    speedIndex: state.speedIndex,
    demoMode  : CONFIG.demoMode,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RNG
// ═══════════════════════════════════════════════════════════════════════════

function randomSymbol(isFree = false) {
  const pool = isFree ? SYMBOL_POOL_FS : SYMBOL_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateGrid(isFree = false) {
  return Array.from({ length: CONFIG.reels }, () =>
    Array.from({ length: CONFIG.rows }, () => randomSymbol(isFree))
  );
}

// ── Bonus Coin values (multiples of bet) ───────────────────────────────────
const COIN_WEIGHT_TOTAL = CONFIG.holdSpin.coinValues.reduce((a, [, w]) => a + w, 0);
function randomCoinMult() {
  let r = Math.random() * COIN_WEIGHT_TOTAL;
  for (const [m, w] of CONFIG.holdSpin.coinValues) { if ((r -= w) < 0) return m; }
  return CONFIG.holdSpin.coinValues[0][0];
}

// [col][row] = coin multiplier, or null for non-coin cells
function assignCoinValues(grid) {
  return grid.map(col => col.map(id => SYM_BY_ID[id].isCoin ? randomCoinMult() : null));
}

function countCoins(grid) {
  let n = 0;
  grid.forEach(col => col.forEach(id => { if (SYM_BY_ID[id].isCoin) n++; }));
  return n;
}

// Compact credit format for coin labels: 60,000 → 60K, 1,500,000 → 1.5M
function shortAmount(v) {
  if (v >= 1e6) return (+(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)) + 'M';
  if (v >= 1e3) return (+(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)) + 'K';
  return String(v);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO SCRIPT — a fully fixed (non-probabilistic) sequence of moments.
// No chance-based forcing, so wins never chain unpredictably. The whole
// sequence repeats every SCRIPT_LENGTH paid spins (spin 20 plays out like
// spin 1, spin 21 like spin 2, etc.). Free Spins are skipped entirely: they
// run on pure RNG and don't consume script positions.
// ═══════════════════════════════════════════════════════════════════════════
const SCRIPT_LENGTH = 19;

function generateBoostedGrid(isFree = false) {
  const grid = generateGrid(isFree);
  if (!CONFIG.demoMode) return grid;  // real mode — pure weighted RNG, no forced wins
  // Free Spins (natural or bought) are never scripted — pure RNG, and they
  // don't advance the script, so it picks up where it left off afterwards.
  if (isFree) return grid;

  // Position within the repeating script (1-based, wraps every SCRIPT_LENGTH
  // paid spins)
  const n = ((state.scriptCount - 1) % SCRIPT_LENGTH) + 1;

  // Helper: write a full 5×3 layout given as three rows (top, middle, bottom)
  const fill = (top, mid, bot) => {
    for (let c = 0; c < CONFIG.reels; c++) {
      grid[c][0] = top[c]; grid[c][1] = mid[c]; grid[c][2] = bot[c];
    }
    return grid;
  };

  // Spin 2 — BIG WIN: 3× Pearl Shell on the middle row (4× bet)
  if (n === 2) return fill(
    ['small_fish','crab','small_fish','crab','small_fish'],
    ['pearl_shell','pearl_shell','pearl_shell','anchor','crab'],
    ['anchor','big_fish','anchor','big_fish','anchor']);

  // Spin 4 — small win: 3× Small Fish on the middle row (1.6× bet)
  if (n === 4) return fill(
    ['anchor','fishing_hook','anchor','fishing_hook','anchor'],
    ['small_fish','small_fish','small_fish','big_fish','crab'],
    ['fishing_hook','anchor','fishing_hook','anchor','fishing_hook']);

  // Spin 5 — MEGA WIN: 5× Pearl Shell on the middle row (24× bet)
  if (n === 5) return fill(
    ['crab','small_fish','crab','small_fish','crab'],
    ['pearl_shell','pearl_shell','pearl_shell','pearl_shell','pearl_shell'],
    ['anchor','fishing_hook','anchor','fishing_hook','anchor']);

  // Spin 9 — MASSIVE WIN: 5× Treasure Chest on the middle row (96× bet)
  if (n === 9) return fill(
    ['crab','small_fish','crab','small_fish','crab'],
    ['treasure_chest','treasure_chest','treasure_chest','treasure_chest','treasure_chest'],
    ['anchor','fishing_hook','anchor','fishing_hook','anchor']);

  // Spin 14 — Scatter trigger: exactly 3 Scatters spread across the top row
  if (n === 14) return fill(
    ['scatter_lucky_lure','octopus','scatter_lucky_lure','octopus','scatter_lucky_lure'],
    ['small_fish','crab','anchor','big_fish','fishing_hook'],
    ['anchor','big_fish','fishing_hook','small_fish','crab']);

  // Spin 17 — Hold & Spin trigger: exactly 6 Bonus Coins (respins use the
  // boosted demo land chance so the showcase usually reaches a jackpot)
  if (n === 17) return fill(
    ['bonus_coin','crab','bonus_coin','anchor','bonus_coin'],
    ['small_fish','bonus_coin','big_fish','bonus_coin','fishing_hook'],
    ['anchor','small_fish','bonus_coin','crab','big_fish']);

  // Every other spin in the script: no forcing — natural weighted RNG,
  // same odds as real mode. Losses stay losses; any win here is pure chance.
  return grid;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

function evalPayline(grid, payline) {
  let baseId = null, count = 0;
  for (let col = 0; col < CONFIG.reels; col++) {
    const sym = SYM_BY_ID[grid[col][payline[col]]];
    if (sym.isScatter || sym.isCoin) break;   // Scatter & Bonus Coin never pay on lines
    if (sym.isWild)    { count++; continue; }
    if (!baseId)               { baseId = sym.id; count++; }
    else if (sym.id === baseId)  count++;
    else break;
  }
  if (baseId && count >= 3)
    return { symbolId: baseId, matchCount: count, payout: SYM_BY_ID[baseId].payouts[count] || 0 };
  return null;
}

function countScatters(grid) {
  const cells = [];
  for (let c = 0; c < CONFIG.reels; c++)
    for (let r = 0; r < CONFIG.rows; r++)
      if (SYM_BY_ID[grid[c][r]].isScatter) cells.push([c, r]);
  return { count: cells.length, cells };
}

function evaluateWins(grid, bet, multiplier = 1) {
  let totalWin = 0;
  const winLines = [], winCells = new Set();

  PAYLINES.forEach((pl, idx) => {
    const res = evalPayline(grid, pl);
    if (!res) return;
    const amt = Math.floor(bet * res.payout * multiplier);
    if (!amt) return;
    totalWin += amt;
    winLines.push({ line: idx + 1, symbolId: res.symbolId, matchCount: res.matchCount, payout: res.payout, amount: amt });
    for (let c = 0; c < res.matchCount; c++) winCells.add(`${c},${pl[c]}`);
  });

  const { count: sc, cells: scCells } = countScatters(grid);
  let bonusSpins = 0, triggerScatter = false;
  if (sc >= 3) {
    triggerScatter = true;
    const scPay  = CONFIG.scatterPays;
    const scSpin = { 3:CONFIG.freeSpins.scatter3.spins,
                     4:CONFIG.freeSpins.scatter4.spins,
                     5:CONFIG.freeSpins.scatter5.spins };
    const k = Math.min(sc, 5);
    totalWin  += Math.floor(bet * scPay[k] * multiplier);
    bonusSpins = scSpin[k];
    scCells.forEach(([c,r]) => winCells.add(`${c},${r}`));
    winLines.push({ line:'SCATTER', symbolId:'scatter_lucky_lure', matchCount:sc,
                    payout:scPay[k], amount:Math.floor(bet*scPay[k]*multiplier) });
  }

  return { totalWin, winLines, winCells, bonusSpins, triggerScatter };
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════════════

let elBalance, elBet, elLastWin, elFreeSpins, elStatus,
    elSpinBtn, elBetMinus, elBetPlus,
    elPaytableBtn, elPaytableModal, elPaytableClose,
    elBuyFsBtnDesktop, elBuyFsBtnMobile, elBuyFsModal,
    elBuyFsCost, elBuyFsConfirm, elBuyFsCancel;

// reelCols[col]  = the reel-col container element
// reelCells[col][row] = the currently-visible cell div (updated after each spin)
let reelCols  = [];
let reelCells = [];

// ═══════════════════════════════════════════════════════════════════════════
// REEL STRIP ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Spins a single reel column using a physical strip approach:
 *
 *  [  cell[0]  ]  ← above visible window (hidden by overflow:hidden)
 *  [  cell[1]  ]  ← above visible window
 *  ──────────────  top of visible window
 *  [  cell[2]  ]  ← row 0 (top)
 *  [  cell[3]  ]  ← row 1 (middle)
 *  [  cell[4]  ]  ← row 2 (bottom)
 *  ──────────────  bottom of visible window
 *  [  cell[5]  ]  ← below visible (hidden)
 *  ...
 *
 * translateY(yOff) makes the strip slide DOWN as yOff increases.
 * When yOff reaches 0, cells[0..2] are at the top of the visible window.
 * While spinning, yOff starts at -EXTRA*cellH and is driven toward positive
 * values; once it would reach 0 we recycle the bottom cell to the top
 * (prepend + subtract one cellH from yOff) to keep the strip infinite.
 */
function spinReel(colIndex, finalSymbols, stopDelay, finalCoinMults = [], isFree = false) {
  const container = reelCols[colIndex];

  // Measure cell height from container  (height = rows * cellH, no gaps)
  const cellH = container.offsetHeight / CONFIG.rows;

  const EXTRA = CONFIG.stripExtra;          // cells kept above visible window
  const TOTAL = CONFIG.rows + EXTRA + 3;    // a few extra below too

  // Mark this column as actively spinning (enables CSS motion-blur filter)
  container.classList.add('is-spinning');

  // ── Build strip ──────────────────────────────────────────────────────
  // Remove any old strip (initial display uses individual cells)
  container.innerHTML = '';

  const strip = document.createElement('div');
  strip.className = 'reel-strip';
  container.appendChild(strip);

  // Cells array, index 0 = topmost in DOM
  const cells = [];
  for (let i = 0; i < TOTAL; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const img = document.createElement('img');
    const sym = SYM_BY_ID[randomSymbol(isFree)];
    img.src = sym.img;
    img.alt = sym.label;
    img.draggable = false;
    cell.appendChild(img);
    strip.appendChild(cell);
    cells.push(cell);
  }

  // Start position: EXTRA cells above the visible window
  // → cells[EXTRA], cells[EXTRA+1], cells[EXTRA+2] are visible
  let yOff = -EXTRA * cellH;
  strip.style.transform = `translateY(${yOff}px)`;

  // ── Animation loop ───────────────────────────────────────────────────
  const speedMult = SPEED_LEVELS[state.speedIndex].mult;
  const pxPerMs = (CONFIG.reelSpeed * speedMult * cellH) / 1000; // scroll speed in px/ms
  let lastTs    = null;
  let rafId     = null;
  let active    = true;

  function tick(ts) {
    if (!active) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50); // cap delta to avoid jumps after tab-switch
    lastTs = ts;

    yOff += pxPerMs * dt; // strip moves DOWN

    // Recycle: when cell[0] would enter the visible window (yOff approaching 0),
    // take the bottom-most cell, give it a new random symbol, and prepend it.
    // Compensate by subtracting one cellH from yOff so the visible area is unchanged.
    while (yOff >= 0) {
      yOff -= cellH;
      const last = cells.pop();
      last.querySelector('img').src = SYM_BY_ID[randomSymbol(isFree)].img;
      strip.prepend(last);
      cells.unshift(last);
    }

    strip.style.transform = `translateY(${yOff}px)`;
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // ── Stop & settle ────────────────────────────────────────────────────
  // Normally fires after stopDelay; quickStop() can trigger it early.
  return new Promise(resolve => {
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(stopTimer);
      // Halt the RAF loop
      active = false;
      cancelAnimationFrame(rafId);

      // Flush any pending recycles so yOff < 0
      while (yOff >= 0) {
        yOff -= cellH;
        const last = cells.pop();
        last.querySelector('img').src = SYM_BY_ID[randomSymbol(isFree)].img;
        strip.prepend(last);
        cells.unshift(last);
      }

      // Place the final symbols in cells[0], [1], [2]
      // They will become visible as the strip eases to translateY(0)
      finalSymbols.forEach((symId, row) => {
        setCellSymbol(cells[row], symId, finalCoinMults[row]);
      });

      // Ease yOff → 0  (remaining scroll distance is -yOff, always positive)
      const startY  = yOff;   // negative value (e.g. -0.4 * cellH)
      const startTs = performance.now();
      const DUR     = speedMult >= 8 ? 260 : 420;    // settle duration in ms (snappier at ×8)

      function settle(ts) {
        const t = Math.min((ts - startTs) / DUR, 1);

        // Ease-out-cubic with a tiny elastic overshoot at the end
        let ease;
        if (t < 0.78) {
          // Accelerating into the slot  (ease-out cubic)
          const u = t / 0.78;
          ease = 1 - Math.pow(1 - u, 3);
        } else {
          // Settle: overshoot then back
          const p = (t - 0.78) / 0.22;
          ease = 1 + Math.sin(p * Math.PI) * 0.06 * (1 - p);
        }

        strip.style.transform = `translateY(${startY * (1 - ease)}px)`;

        if (t < 1) {
          requestAnimationFrame(settle);
        } else {
          // Snap exactly to 0
          strip.style.transform = 'translateY(0)';

          // Remove spinning flag (disables motion-blur filter)
          container.classList.remove('is-spinning');

          // Expose the visible cells for win-highlighting
          reelCells[colIndex] = [cells[0], cells[1], cells[2]];

          // Brief "click" flash on landed cells
          reelCells[colIndex].forEach(c => {
            c.classList.add('reel-stop');
            setTimeout(() => c.classList.remove('reel-stop'), 420);
          });

          resolve();
        }
      }
      requestAnimationFrame(settle);
    };
    const stopTimer = setTimeout(stop, stopDelay);
    reelStoppers[colIndex] = stop;
  });
}

// Tap / Space during a spin stops all remaining reels almost at once
let reelStoppers = [];
function quickStop() {
  if (!state.spinning) return;
  reelStoppers.forEach((stop, i) => stop && setTimeout(stop, i * 60));
  reelStoppers = [];
}

// Puts a symbol into a cell; Bonus Coins also get their credit value label.
function setCellSymbol(cell, symId, coinMult = null) {
  const sym = SYM_BY_ID[symId];
  const img = cell.querySelector('img');
  img.src = sym.img;
  img.alt = sym.label;
  cell.classList.remove('hs-empty');
  let lbl = cell.querySelector('.coin-value');
  if (sym.isCoin && coinMult != null) {
    if (!lbl) {
      lbl = document.createElement('span');
      lbl.className = 'coin-value';
      cell.appendChild(lbl);
    }
    lbl.textContent = shortAmount(coinMult * CONFIG.betLevels[state.betIndex]);
  } else if (lbl) {
    lbl.remove();
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// UI ANIMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function animateNumber(el, from, to, dur = 600) {
  if (from === to) { el.textContent = to.toLocaleString(); return; }
  const t0 = performance.now(), d = to - from;
  const step = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(from + d * easeOut(p)).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function clearWinEffects() {
  clearPaylines();
  document.querySelectorAll('.cell.win-glow, .cell.scatter-glow')
    .forEach(c => c.classList.remove('win-glow', 'scatter-glow'));
  state.winCells.clear();
}

function applyWinEffects(winCells, winLines) {
  clearWinEffects();
  const hasScatter = winLines.some(w => w.line === 'SCATTER');
  winCells.forEach(key => {
    const [c, r] = key.split(',').map(Number);
    const cell = reelCells[c]?.[r];
    if (!cell) return;
    const isScatterCell = SYM_BY_ID[state.grid[c][r]]?.isScatter;
    cell.classList.add(hasScatter && isScatterCell ? 'scatter-glow' : 'win-glow');
  });
}

function spawnCoins(n = 12) {
  const board = document.getElementById('game-board');
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'coin-particle';
    el.style.left = (15 + Math.random() * 70) + '%';
    el.style.top  = (20 + Math.random() * 55) + '%';
    el.style.setProperty('--tx', (Math.random() * 200 - 100) + 'px');
    el.style.setProperty('--ty', -(60 + Math.random() * 120) + 'px');
    el.style.animationDelay = (Math.random() * 0.35) + 's';
    board.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function spawnBubbles() {
  const board = document.getElementById('game-board');
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'bubble-particle';
    el.style.left = (5 + Math.random() * 90) + '%';
    el.style.top  = (50 + Math.random() * 40) + '%';
    el.style.setProperty('--bs', (6 + Math.random() * 16) + 'px');
    el.style.setProperty('--br', -(80 + Math.random() * 150) + 'px');
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    board.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE SPIN
// ═══════════════════════════════════════════════════════════════════════════

async function doSpin() {
  if (!state.ready || state.spinning || state.inHoldSpin) return;

  const isFree = state.freeSpins > 0;
  const bet    = CONFIG.betLevels[state.betIndex];

  if (!isFree && state.balance < bet) {
    // Step the bet down to the largest one the balance still covers
    let i = state.betIndex;
    while (i > 0 && CONFIG.betLevels[i] > state.balance) i--;
    if (CONFIG.betLevels[i] <= state.balance) {
      state.betIndex = i;
      updateBetDisplay();
      saveProgress();
      setStatus(`Bet lowered to ${CONFIG.betLevels[i].toLocaleString()} so you can keep playing.`);
    } else {
      showRefill();
    }
    return;
  }

  state.spinning = true;
  reelStoppers = [];
  clearWinEffects();
  if (!isFree) setStatus('🎣 Reeling in…');
  // SPIN stays clickable during the spin — it acts as STOP
  elBetMinus.disabled = elBetPlus.disabled = true;
  elSpinBtn.classList.add('is-stop');
  elSpinBtn.textContent = '■ STOP';
  updateBuyFreeSpinsUI();

  if (!isFree) {
    const prev = state.balance;
    state.balance -= bet;
    animateNumber(elBalance, prev, state.balance, 250);
  } else {
    state.freeSpins--;
    updateFreeSpinsDisplay();
    // The FREE SPINS banner already shows how many are left, so the status
    // bar shows progress instead (two "remaining" counts read as off-by-one)
    const nth = state.fsPlayed + 1, total = state.fsPlayed + 1 + state.freeSpins;
    setStatus(`🌊 Free Spin ${nth} of ${total} · wins pay ${CONFIG.freeSpins.multiplier}×`);
  }

  // Outcome — use boosted grid for early spins
  state.spinCount++;
  if (!isFree) state.scriptCount++;
  const grid = generateBoostedGrid(isFree);
  state.grid = grid;
  state.coinMults = assignCoinValues(grid);

  // Spin all reels; left reel stops first, right reel stops last
  // Timing is divided by the speed multiplier so higher speeds finish faster
  const sm       = SPEED_LEVELS[state.speedIndex].mult;
  const stagger  = CONFIG.reelStagger  / sm;
  const lastStop = CONFIG.lastReelStop / sm;
  const firstStop = lastStop - (CONFIG.reels - 1) * stagger;
  const ps = [];
  for (let col = 0; col < CONFIG.reels; col++) {
    ps.push(spinReel(col, grid[col], firstStop + col * stagger, state.coinMults[col], isFree));
  }
  await Promise.all(ps);
  elSpinBtn.classList.remove('is-stop');

  // Evaluate
  const mult = isFree ? CONFIG.freeSpins.multiplier : 1;
  const { totalWin, winLines, winCells, bonusSpins, triggerScatter } =
    evaluateWins(grid, bet, mult);

  state.lastWin  = totalWin;
  state.winLines = winLines;
  if (isFree) { state.fsTotal += totalWin; state.fsPlayed++; }

  // Hold & Spin — base game only (coins aren't in the Free Spins pool anyway)
  const triggerHold = !isFree && countCoins(grid) >= CONFIG.holdSpin.trigger;

  // When Hold & Spin follows, skip the line-win overlay — the feature's own
  // celebration comes at the end instead.
  const willShowOverlay = totalWin >= bet * 2 && !triggerHold;

  if (totalWin > 0) {
    applyWinEffects(winCells, winLines);
    showPaylines(winLines);
    const prev = state.balance;
    state.balance += totalWin;
    animateNumber(elBalance, prev, state.balance, 800);
    // Accumulate session win and animate from previous total to new total
    const prevSession = state.sessionWin;
    state.sessionWin += totalWin;
    animateNumber(elLastWin, prevSession, state.sessionWin, 650);
    spawnCoins(Math.min(8 + Math.floor(totalWin / bet * 2), 28));
    // Win overlay: trigger for any win ≥ 2× the bet
    if (willShowOverlay) {
      setTimeout(() => showWinOverlay(totalWin, bet), 600);
    }
  }
  // No win — keep displaying accumulated session total (don't reset to 0)

  if (triggerScatter) {
    spawnBubbles();
    if (!isFree) { state.fsActive = true; state.fsTotal = 0; state.fsPlayed = 0; }
    state.freeSpins += bonusSpins;
    updateFreeSpinsDisplay();
    setStatus(isFree
      ? `🌊 Retriggered! +${bonusSpins} Free Spins! Win: ${totalWin.toLocaleString()}`
      : `🎉 SCATTER! ${bonusSpins} Free Spins unlocked! Win: ${totalWin.toLocaleString()}`);
  } else if (totalWin > 0) {
    // Short summary — the per-line amounts are shown on the drawn paylines
    const n = winLines.length;
    setStatus(`✨ Win +${totalWin.toLocaleString()} · ${n} line${n > 1 ? 's' : ''}`);
  } else if (isFree) {
    setStatus(state.freeSpins > 0 ? 'Free spin · no win this time' : '🏁 Free Spins complete!');
  } else {
    setStatus('No win this time. Cast again!');
  }

  updateSpinButton();
  if (isFree && state.freeSpins === 0 && state.fsActive) state.fsPendingSummary = true;

  if (triggerHold) {
    setStatus(`🪙 ${countCoins(grid)} Bonus Coins! HOLD & SPIN!` +
      (totalWin > 0 ? `  Win: +${totalWin.toLocaleString()}` : ''));
    state.inHoldSpin = true;     // keeps SPIN / bet / buy locked
    state.spinning   = false;
    elSpinBtn.disabled = true;
    updateBuyFreeSpinsUI();
    setTimeout(() => runHoldSpin(bet), 1300);
    return;
  }

  state.spinning = false;
  elSpinBtn.disabled  = false;
  elBetMinus.disabled = state.freeSpins > 0;
  elBetPlus.disabled  = state.freeSpins > 0;
  updateBuyFreeSpinsUI();

  // What happens next (next Free Spin, Free Spins summary, refill offer).
  // If a win overlay is about to show, defer — hideWinOverlay() continues
  // things once the player collects (or it auto-dismisses).
  saveProgress();
  if (!willShowOverlay) continueAfterSpin();
}

// Single place that decides what follows a finished spin or popup
function continueAfterSpin() {
  saveProgress();
  if (state.fsPendingSummary) {
    state.fsPendingSummary = false;
    setTimeout(showFsSummary, 600);
    return;
  }
  if (state.freeSpins > 0) { scheduleAutoFreeSpin(); return; }
  maybeOfferRefill();
}

// Auto-advance to the next Free Spin (used for both naturally-triggered and
// purchased Free Spins) — the player never has to click during the feature.
function scheduleAutoFreeSpin() {
  if (state.freeSpins <= 0) return;
  setTimeout(() => {
    if (!state.spinning && !state.inHoldSpin && state.freeSpins > 0) doSpin();
  }, Math.max(250, 1000 / SPEED_LEVELS[state.speedIndex].mult));   // shorter pause at higher speeds
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLD & SPIN (jackpot feature)
// ═══════════════════════════════════════════════════════════════════════════

// Progressive jackpots: value = seed (mult × bet) × (1 + growth)
const jackpotGrowth = { grand: 0, major: 0, minor: 0, mini: 0 };

function jackpotValue(key, bet = CONFIG.betLevels[state.betIndex]) {
  const jp = CONFIG.holdSpin.jackpots.find(j => j.key === key);
  return Math.floor(jp.mult * bet * (1 + jackpotGrowth[key]));
}

function renderJackpots() {
  CONFIG.holdSpin.jackpots.forEach(({ key }) => {
    const str = jackpotValue(key).toLocaleString();
    const a = document.getElementById('jp-' + key);
    const b = document.getElementById('mjp-' + key);
    if (a) a.textContent = str;
    if (b) b.textContent = str;
  });
}

function startJackpotTickers() {
  const TICK = 120;
  const { growthPerSec, growthCap } = CONFIG.holdSpin;
  renderJackpots();
  setInterval(() => {
    Object.keys(jackpotGrowth).forEach(k => {
      jackpotGrowth[k] = Math.min(growthCap, jackpotGrowth[k] + growthPerSec * TICK / 1000);
    });
    renderJackpots();
  }, TICK);
}

function setHoldSpinPanel(respins, filled, total) {
  const panel = document.getElementById('hs-panel');
  if (!panel) return;
  const next = [...CONFIG.holdSpin.jackpots].reverse().find(j => filled < j.fill);
  document.getElementById('hs-respins').innerHTML =
    Array.from({ length: CONFIG.holdSpin.respins }, (_, i) =>
      `<span class="hs-dot${i < respins ? ' on' : ''}"></span>`).join('');
  document.getElementById('hs-count').textContent = `${filled} / 15`;
  document.getElementById('hs-total').textContent = total.toLocaleString();
  document.getElementById('hs-next').textContent = next
    ? `${next.label} @ ${next.fill}` : 'GRAND!';
}

async function runHoldSpin(bet) {
  const hs     = CONFIG.holdSpin;
  const chance = CONFIG.demoMode ? hs.demoLandChance : hs.landChance;
  const sm     = SPEED_LEVELS[state.speedIndex].mult;
  const locked = state.coinMults.map(col => col.slice());   // [c][r] mult|null

  clearWinEffects();
  document.body.classList.add('hold-spin-active');

  // Clear every non-coin cell; lock the coins
  let filled = 0;
  for (let c = 0; c < CONFIG.reels; c++) {
    for (let r = 0; r < CONFIG.rows; r++) {
      const cell = reelCells[c][r];
      if (locked[c][r] != null) { cell.classList.add('hs-locked'); filled++; }
      else {
        cell.classList.add('hs-empty');
        const lbl = cell.querySelector('.coin-value');
        if (lbl) lbl.remove();
      }
    }
  }
  const sumCoins = () => locked.flat().reduce((a, m) => a + (m || 0) * bet, 0);

  let respins = hs.respins;
  setHoldSpinPanel(respins, filled, sumCoins());
  await sleep(1200 / sm);

  while (respins > 0 && filled < 15) {
    respins--;
    setHoldSpinPanel(respins, filled, sumCoins());
    setStatus(`🪙 HOLD & SPIN · respins left: ${respins}`);

    const empties = [];
    for (let c = 0; c < CONFIG.reels; c++)
      for (let r = 0; r < CONFIG.rows; r++)
        if (locked[c][r] == null) empties.push([c, r]);

    empties.forEach(([c, r]) => reelCells[c][r].classList.add('hs-rolling'));
    await sleep(800 / sm);

    let landed = 0;
    for (const [c, r] of empties) {
      const cell = reelCells[c][r];
      cell.classList.remove('hs-rolling');
      if (Math.random() < chance) {
        locked[c][r] = randomCoinMult();
        setCellSymbol(cell, 'bonus_coin', locked[c][r]);
        cell.classList.add('hs-locked', 'hs-new');
        setTimeout(() => cell.classList.remove('hs-new'), 600);
        landed++;
        await sleep(140 / sm);
      }
    }
    if (landed) {
      filled += landed;
      respins = hs.respins;          // any new coin resets the respins
      spawnCoins(6 + landed * 2);
    }
    setHoldSpinPanel(respins, filled, sumCoins());
    await sleep(650 / sm);
  }

  // ── Payout: coin values + highest jackpot reached ──
  const coinTotal = sumCoins();
  const jp = hs.jackpots.find(j => filled >= j.fill);   // highest first
  let jpAmount = 0;
  if (jp) {
    jpAmount = jackpotValue(jp.key, bet);
    jackpotGrowth[jp.key] = 0;                         // reset to seed
    renderJackpots();
    document.querySelectorAll(`.jp-panel.${jp.key}, .mjp-${jp.key}`)
      .forEach(el => { el.classList.add('jp-won'); setTimeout(() => el.classList.remove('jp-won'), 4000); });
  }
  const total = coinTotal + jpAmount;

  const prev = state.balance;
  state.balance += total;
  animateNumber(elBalance, prev, state.balance, 900);
  const prevSession = state.sessionWin;
  state.sessionWin += total;
  animateNumber(elLastWin, prevSession, state.sessionWin, 700);

  setStatus(`🪙 Hold & Spin complete · ${filled} coins` +
    (jp ? ` · ${jp.label} JACKPOT +${jpAmount.toLocaleString()}` : '') +
    ` · Win +${total.toLocaleString()}`);

  await sleep(500);
  document.body.classList.remove('hold-spin-active');
  state.inHoldSpin = false;
  elSpinBtn.disabled  = false;
  elBetMinus.disabled = state.freeSpins > 0 || state.betIndex === 0;
  elBetPlus.disabled  = state.freeSpins > 0 || state.betIndex === CONFIG.betLevels.length - 1;
  updateBuyFreeSpinsUI();

  saveProgress();
  // Celebration — closing it also resumes any Free Spins won on the same spin
  showWinOverlay(total, bet, jp ? `${jp.label} JACKPOT!` : 'HOLD & SPIN WIN!');
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function setStatus(msg) { elStatus.textContent = msg; }

// ── Win Celebration Overlay ───────────────────────────────────────────────
let _winOverlayTimer = null;
let _winCounting = false, _winSkip = false;

// While the win amount is still counting up, a tap/Space jumps to the final
// number instead of closing. Returns true if it consumed the input.
function finishWinCount() {
  if (!_winCounting) return false;
  _winSkip = true;
  return true;
}
function winOverlayOpen() {
  const o = document.getElementById('win-overlay');
  return !!(o && o.classList.contains('open'));
}
// Any popup that should block spinning from Space / board taps
function popupOpen() {
  const b = document.body.classList;
  return winOverlayOpen() || b.contains('paytable-open') || b.contains('buyfs-open') ||
         b.contains('drawer-open') || b.contains('info-open');
}

function showWinOverlay(amount, bet, labelOverride = null) {
  const overlay    = document.getElementById('win-overlay');
  const tierLabel  = document.getElementById('win-tier-label');
  const amountEl   = document.getElementById('win-overlay-amount');
  const particles  = document.getElementById('win-particles');
  if (!overlay) return;

  // Clear any pending auto-dismiss
  if (_winOverlayTimer) { clearTimeout(_winOverlayTimer); _winOverlayTimer = null; }

  // Determine tier
  const mult = bet > 0 ? amount / bet : 0;
  let tier, label, sparkColor;
  if (mult >= 25) {
    tier = 'tier-massive'; label = 'MASSIVE WIN!'; sparkColor = '#ff6000';
  } else if (mult >= 10) {
    tier = 'tier-mega';    label = 'MEGA WIN!';    sparkColor = '#00ddff';
  } else {
    tier = 'tier-big';     label = 'BIG WIN!';     sparkColor = '#ffd840';
  }

  // Apply tier class
  overlay.className = '';
  overlay.classList.add('open', tier);
  tierLabel.textContent = labelOverride || label;
  tierLabel.classList.toggle('long', tierLabel.textContent.length > 12);
  amountEl.textContent  = '0';

  // Spawn particles
  particles.innerHTML = '';
  const count = tier === 'tier-massive' ? 40 : tier === 'tier-mega' ? 28 : 20;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'win-spark';
    const angle = Math.random() * 360;
    const dist  = 120 + Math.random() * 260;
    s.style.cssText = `
      left:50%; top:40%;
      --tx:${Math.cos(angle * Math.PI/180) * dist}px;
      --ty:${Math.sin(angle * Math.PI/180) * dist}px;
      --dur:${0.7 + Math.random() * 1.0}s;
      background:${sparkColor};
      animation-delay:${Math.random() * 0.3}s;
      width:${4 + Math.random() * 7}px;
      height:${4 + Math.random() * 7}px;
    `;
    particles.appendChild(s);
  }

  // Animate amount counter (counts up over ~2s; a tap finishes it at once)
  const duration = 2000;
  const startTs  = performance.now();
  _winCounting = true; _winSkip = false;
  function tick(now) {
    const t = _winSkip ? 1 : Math.min((now - startTs) / duration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    amountEl.textContent = Math.floor(ease * amount).toLocaleString();
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      amountEl.textContent = amount.toLocaleString();
      _winCounting = false;
      // Auto-dismiss after 8s if player hasn't pressed COLLECT
      _winOverlayTimer = setTimeout(hideWinOverlay, 8000);
    }
  }
  requestAnimationFrame(tick);
}

function hideWinOverlay() {
  const overlay = document.getElementById('win-overlay');
  if (!overlay || !overlay.classList.contains('open')) return;
  if (_winOverlayTimer) { clearTimeout(_winOverlayTimer); _winOverlayTimer = null; }
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('open', 'closing', 'tier-big', 'tier-mega', 'tier-massive');
    // Big win overlay just closed — carry on (next Free Spin, summary, …)
    continueAfterSpin();
  }, 500);
}

// Full session reset — used when switching between Demo and Real mode so
// neither mode's progress/balance carries over into the other.
function resetSession() {
  if (state.spinning || state.inHoldSpin) return;   // don't reset mid-spin / mid-feature

  state.balance    = CONFIG.startingBalance;
  state.betIndex   = CONFIG.defaultBetIndex;
  state.freeSpins  = 0;
  state.sessionWin = 0;
  state.spinCount  = 0;
  state.scriptCount = 0;
  state.coinMults   = [];
  state.fsActive = false; state.fsTotal = 0; state.fsPlayed = 0; state.fsPendingSummary = false;
  Object.keys(jackpotGrowth).forEach(k => jackpotGrowth[k] = 0);
  renderJackpots();
  state.lastWin    = 0;
  state.winLines   = [];
  state.winCells   = new Set();

  clearWinEffects();
  closeBuyFreeSpinsModal();
  elBalance.textContent = state.balance.toLocaleString();
  elLastWin.textContent = '0';
  updateBetDisplay();
  updateFreeSpinsDisplay();
  updateBuyFreeSpinsUI();
  closeInfoModal('refill-modal');
  setStatus('Welcome to Fishing Fortune Reels · Press SPIN to cast! 🎣');
  saveProgress();
}

function updateBetDisplay() {
  const bet = CONFIG.betLevels[state.betIndex];
  elBet.textContent = bet.toLocaleString();
  document.getElementById('bet-value-ctrl').textContent = bet.toLocaleString();
  elBetMinus.disabled = state.betIndex === 0 || state.freeSpins > 0;
  elBetPlus.disabled  = state.betIndex === CONFIG.betLevels.length - 1 || state.freeSpins > 0;
  updateBuyFreeSpinsUI();
  renderJackpots();   // jackpots are multiples of the current bet
}

function updateFreeSpinsDisplay() {
  elFreeSpins.textContent = state.freeSpins;
  document.getElementById('free-spins-row').style.display = state.freeSpins > 0 ? 'flex' : 'none';
  updateSpinButton();
  updateBuyFreeSpinsUI();
}

function updateSpinButton() {
  if (state.freeSpins > 0) {
    elSpinBtn.textContent = '🌊 FREE SPIN';
    elSpinBtn.classList.add('free-spin-mode');
  } else {
    elSpinBtn.textContent = '⚡ SPIN';
    elSpinBtn.classList.remove('free-spin-mode');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WINNING PAYLINES — drawn over the reels. All winning lines flash together,
// then each one is traced in turn with its amount, looping until next spin.
// ═══════════════════════════════════════════════════════════════════════════
const LINE_COLORS = ['#ffd84a','#5ef0ff','#ff8ad8','#9dff6a','#ffa94a',
                     '#b59bff','#ff6a6a','#6affc9','#ffe9a8','#7ab8ff'];
let _plTimer = null;

function clearPaylines() {
  if (_plTimer) { clearInterval(_plTimer); _plTimer = null; }
  const svg = document.getElementById('payline-layer');
  if (svg) svg.innerHTML = '';
}

function showPaylines(winLines) {
  const lines = winLines.filter(w => w.line !== 'SCATTER');
  const svg   = document.getElementById('payline-layer');
  const board = document.getElementById('game-board');
  if (!svg || !board || !lines.length) return;

  const br = board.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
  const center = (c, r) => {
    const b = reelCells[c][r].getBoundingClientRect();
    return [b.left - br.left + b.width / 2, b.top - br.top + b.height / 2];
  };
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const groups = lines.map(w => {
    const pl  = PAYLINES[w.line - 1];
    const pts = pl.map((r, c) => center(c, r));
    const first = pts[0], last = pts[pts.length - 1];
    const cellW = reelCells[0][0].getBoundingClientRect().width;
    // extend a little past the outer reels so the line reads as a full payline
    const path = [[first[0] - cellW * 0.55, first[1]], ...pts, [last[0] + cellW * 0.55, last[1]]]
      .map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const color = LINE_COLORS[(w.line - 1) % LINE_COLORS.length];
    const g = el('g', { class: 'pl-line' });
    g.appendChild(el('polyline', { points: path, class: 'pl-glow', stroke: color }));
    g.appendChild(el('polyline', { points: path, class: 'pl-core', stroke: color }));
    // dots on the matching cells
    for (let c = 0; c < w.matchCount; c++) {
      g.appendChild(el('circle', { cx: pts[c][0], cy: pts[c][1], r: 5, fill: color, class: 'pl-dot' }));
    }
    // line number badge at the left end
    const bx = first[0] - cellW * 0.55, by = first[1];
    g.appendChild(el('circle', { cx: bx, cy: by, r: 13, fill: '#04163a', stroke: color, 'stroke-width': 2.5 }));
    const num = el('text', { x: bx, y: by + 4.5, class: 'pl-num' }); num.textContent = w.line; g.appendChild(num);
    // amount tag on the last matching cell
    const tag = el('text', { x: pts[w.matchCount - 1][0], y: pts[w.matchCount - 1][1] - cellW * 0.32, class: 'pl-amt' });
    tag.textContent = '+' + w.amount.toLocaleString();
    g.appendChild(tag);
    svg.appendChild(g);
    return g;
  });

  // Phase 1: all lines at once; phase 2: one at a time (only if > 1)
  groups.forEach(g => g.classList.add('on'));
  groups.forEach(g => g.classList.add('no-amt'));
  if (groups.length === 1) { groups[0].classList.remove('no-amt'); return; }
  let i = -1;
  setTimeout(() => {
    if (!svg.contains(groups[0])) return;            // already cleared
    const step = () => {
      i = (i + 1) % groups.length;
      groups.forEach((g, k) => { g.classList.toggle('on', k === i); g.classList.toggle('no-amt', k !== i); });
    };
    step();
    _plTimer = setInterval(step, 1100);
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// INFO POPUPS — Free Spins summary + out-of-coins refill
// ═══════════════════════════════════════════════════════════════════════════
let _fsSummaryTimer = null;

function openInfoModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  document.body.classList.add('info-open');
  const btn = m.querySelector('.info-btn');
  if (btn) setTimeout(() => btn.focus({ preventScroll: true }), 50);
}
function closeInfoModal(id) {
  const m = document.getElementById(id);
  if (!m || !m.classList.contains('open')) return false;
  m.classList.remove('open');
  if (!document.querySelector('.info-modal.open')) document.body.classList.remove('info-open');
  return true;
}

function showFsSummary() {
  if (winOverlayOpen()) { setTimeout(showFsSummary, 400); return; }
  document.getElementById('fs-sum-spins').textContent = state.fsPlayed;
  document.getElementById('fs-sum-mult').textContent  = CONFIG.freeSpins.multiplier + '×';
  const totalEl = document.getElementById('fs-sum-total');
  totalEl.textContent = '0';
  openInfoModal('fs-summary-modal');
  animateNumber(totalEl, 0, state.fsTotal, 1100);
  setStatus(`🏁 Free Spins complete · won ${state.fsTotal.toLocaleString()}`);
  if (_fsSummaryTimer) clearTimeout(_fsSummaryTimer);
  _fsSummaryTimer = setTimeout(collectFsSummary, 9000);   // auto-close if left alone
}
function collectFsSummary() {
  if (_fsSummaryTimer) { clearTimeout(_fsSummaryTimer); _fsSummaryTimer = null; }
  if (!closeInfoModal('fs-summary-modal')) return;
  state.fsActive = false;
  continueAfterSpin();
}

function maybeOfferRefill() {
  if (state.spinning || state.inHoldSpin || state.freeSpins > 0) return;
  if (state.balance < CONFIG.betLevels[0]) showRefill();
}
function showRefill() {
  document.getElementById('refill-amount').textContent = CONFIG.refillAmount.toLocaleString();
  openInfoModal('refill-modal');
}
function collectRefill() {
  if (!closeInfoModal('refill-modal')) return;
  const prev = state.balance;
  state.balance += CONFIG.refillAmount;
  animateNumber(elBalance, prev, state.balance, 900);
  spawnCoins(24);
  setStatus(`🎁 +${CONFIG.refillAmount.toLocaleString()} free coins — good luck!`);
  updateBuyFreeSpinsUI();
  saveProgress();
}

// ═══════════════════════════════════════════════════════════════════════════
// BUY FREE SPINS ("Feature Buy")
// ═══════════════════════════════════════════════════════════════════════════

function buyFreeSpinsCost() {
  return CONFIG.betLevels[state.betIndex] * CONFIG.buyFreeSpins.multiplier;
}

// Keeps both buttons' displayed cost + enabled/disabled state in sync.
// Call whenever bet, balance, freeSpins, or spinning state changes.
function updateBuyFreeSpinsUI() {
  const cost = buyFreeSpinsCost();
  const costStr = cost.toLocaleString();
  const disabled = state.spinning || state.inHoldSpin || state.freeSpins > 0 || state.balance < cost;

  [elBuyFsBtnDesktop, elBuyFsBtnMobile].forEach(btn => {
    if (!btn) return;
    btn.disabled = disabled;
    const costEl = btn.querySelector('.buy-fs-cost');
    if (costEl) costEl.textContent = costStr;
  });
}

function openBuyFreeSpinsModal() {
  if (state.spinning || state.inHoldSpin || state.freeSpins > 0) return;
  const cost = buyFreeSpinsCost();
  if (state.balance < cost) {
    setStatus('⚠️  Not enough coins to buy Free Spins.');
    return;
  }
  if (elBuyFsCost) elBuyFsCost.textContent = cost.toLocaleString();
  if (elBuyFsModal) elBuyFsModal.classList.add('open');
  document.body.classList.add('buyfs-open');
}

function closeBuyFreeSpinsModal() {
  if (elBuyFsModal) elBuyFsModal.classList.remove('open');
  document.body.classList.remove('buyfs-open');
}

function confirmBuyFreeSpins() {
  const cost = buyFreeSpinsCost();
  if (state.spinning || state.inHoldSpin || state.freeSpins > 0 || state.balance < cost) {
    closeBuyFreeSpinsModal();
    updateBuyFreeSpinsUI();
    return;
  }
  const prev = state.balance;
  state.balance -= cost;
  animateNumber(elBalance, prev, state.balance, 300);

  state.freeSpins += CONFIG.buyFreeSpins.spins;
  state.fsActive = true; state.fsTotal = 0; state.fsPlayed = 0;
  updateFreeSpinsDisplay();
  setStatus(`🌊 Bought ${CONFIG.buyFreeSpins.spins} Free Spins for ${cost.toLocaleString()}!`);
  closeBuyFreeSpinsModal();
  updateBuyFreeSpinsUI();

  // Auto-start — the player doesn't need to click, purchased Free Spins just run
  scheduleAutoFreeSpin();
}

function buildPaytable() {
  document.getElementById('paytable-body').innerHTML = SYMBOLS.map(s => {
    const fs = CONFIG.freeSpins, sp = CONFIG.scatterPays;
    const pay = s.isWild ? 'Substitutes for all regular symbols'
              : s.isScatter
                ? `3 anywhere: <b>${sp[3]}×</b> + ${fs.scatter3.spins} Free Spins<br>` +
                  `4 anywhere: <b>${sp[4]}×</b> + ${fs.scatter4.spins} Free Spins<br>` +
                  `5 anywhere: <b>${sp[5]}×</b> + ${fs.scatter5.spins} Free Spins`
              : s.isCoin
                ? `${CONFIG.holdSpin.trigger}+ anywhere triggers <b>Hold &amp; Spin</b><br>Each coin shows a prize of 1×–15× bet`
                : Object.entries(s.payouts).map(([n,m]) => `${n}×: <b>${m}×</b> bet`).join('<br>');
    return `<tr>
      <td><img src="${s.img}" alt="${s.label}" class="pt-icon"></td>
      <td>${s.label}</td>
      <td>${pay}</td>
    </tr>`;
  }).join('');
}

// ── Build initial reel display (static, before first spin) ────────────────
function buildReelGrid() {
  const board = document.getElementById('reel-grid');
  board.innerHTML = '';
  reelCols  = [];
  reelCells = [];

  for (let col = 0; col < CONFIG.reels; col++) {
    const colDiv = document.createElement('div');
    colDiv.className = 'reel-col';

    // Initial display: three plain cells (will be replaced on first spin)
    const colCells = [];
    for (let row = 0; row < CONFIG.rows; row++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const img = document.createElement('img');
      const sym = SYM_BY_ID[randomSymbol(true)];   // no coins on the idle board (they'd have no value)
      img.src = sym.img;
      img.alt = sym.label;
      img.draggable = false;
      cell.appendChild(img);
      colDiv.appendChild(cell);
      colCells.push(cell);
    }

    board.appendChild(colDiv);
    reelCols.push(colDiv);
    reelCells.push(colCells);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

function wireEvents() {
  // SPIN doubles as STOP while the reels are turning
  const spinOrStop = () => {
    if (state.spinning) { quickStop(); return; }
    if (!elSpinBtn.disabled) doSpin();
  };
  elSpinBtn.addEventListener('click', spinOrStop);

  // Win overlay: while the amount is counting, a tap finishes the count
  // (capture phase, so COLLECT doesn't also close it on that first tap)
  const winOv = document.getElementById('win-overlay');
  if (winOv) winOv.addEventListener('click', e => {
    if (finishWinCount()) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // Info popups
  const fsCollect = document.getElementById('fs-sum-collect');
  if (fsCollect) fsCollect.addEventListener('click', collectFsSummary);
  const refillBtn = document.getElementById('refill-collect');
  if (refillBtn) refillBtn.addEventListener('click', collectRefill);

  // Speed toggle button
  const speedBtn       = document.getElementById('speed-toggle-btn');
  const mobileSpeedBtn = document.getElementById('mobile-speed-toggle');

  function applySpeed() {
    const lv = SPEED_LEVELS[state.speedIndex];
    if (speedBtn)       speedBtn.textContent       = lv.label;
    if (mobileSpeedBtn) mobileSpeedBtn.textContent = `⚡ SPEED: ×${lv.mult}`;
  }

  if (speedBtn) {
    speedBtn.addEventListener('click', () => {
      state.speedIndex = (state.speedIndex + 1) % SPEED_LEVELS.length;
      applySpeed(); saveProgress();
    });
  }
  if (mobileSpeedBtn) {
    mobileSpeedBtn.addEventListener('click', () => {
      state.speedIndex = (state.speedIndex + 1) % SPEED_LEVELS.length;
      applySpeed(); saveProgress();
    });
  }
  applySpeed();   // reflect a saved speed on load

  // Clicking anywhere on the reel board also triggers spin
  const elBoard = document.getElementById('game-board');
  if (elBoard) {
    elBoard.addEventListener('click', () => {
      if (popupOpen()) return;
      spinOrStop();
    });
    elBoard.style.cursor = 'pointer';
  }
  elBetMinus.addEventListener('click', () => {
    if (state.spinning || state.inHoldSpin) return;
    if (state.betIndex > 0) { state.betIndex--; updateBetDisplay(); saveProgress(); }
  });
  elBetPlus.addEventListener('click', () => {
    if (state.spinning || state.inHoldSpin) return;
    if (state.betIndex < CONFIG.betLevels.length - 1) { state.betIndex++; updateBetDisplay(); saveProgress(); }
  });
  function openPaytable()  { elPaytableModal.classList.add('open');    document.body.classList.add('paytable-open'); }
  function closePaytable() { elPaytableModal.classList.remove('open'); document.body.classList.remove('paytable-open'); }

  elPaytableBtn.addEventListener('click', openPaytable);
  elPaytableClose.addEventListener('click', closePaytable);
  elPaytableModal.addEventListener('click', e => { if (e.target === elPaytableModal) closePaytable(); });

  // Buy Free Spins — desktop floating button, mobile drawer button, confirm popup
  if (elBuyFsBtnDesktop) elBuyFsBtnDesktop.addEventListener('click', openBuyFreeSpinsModal);
  if (elBuyFsBtnMobile)  elBuyFsBtnMobile.addEventListener('click', openBuyFreeSpinsModal);
  if (elBuyFsConfirm)    elBuyFsConfirm.addEventListener('click', confirmBuyFreeSpins);
  if (elBuyFsCancel)     elBuyFsCancel.addEventListener('click', closeBuyFreeSpinsModal);
  if (elBuyFsModal) {
    elBuyFsModal.addEventListener('click', e => { if (e.target === elBuyFsModal) closeBuyFreeSpinsModal(); });
  }
  document.addEventListener('keydown', e => {
    if (!state.ready) return;   // let Space/Enter press the loading screen's button
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    // Win popup: first press finishes the count-up, the next one collects
    if (winOverlayOpen()) {
      e.preventDefault();
      if (!finishWinCount()) hideWinOverlay();
      return;
    }
    // Any other popup: leave keys to its focused button, never spin behind it
    if (popupOpen()) return;
    if (e.code !== 'Space') return;
    e.preventDefault();
    spinOrStop();
  });

  // Max-bet button
  const maxBetBtn = document.getElementById('max-bet-btn');
  if (maxBetBtn) {
    maxBetBtn.addEventListener('click', () => {
      if (!state.spinning && !state.inHoldSpin && state.freeSpins === 0) {
        state.betIndex = CONFIG.betLevels.length - 1;
        updateBetDisplay();
        saveProgress();
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// Every image the game can ever show (symbols, banners, buttons, CSS
// backgrounds, avatars, mascot) is downloaded AND decoded up front, plus the
// web fonts, so nothing pops in half-drawn the first time it appears.
// The asset list is collected automatically from SYMBOLS, the page's <img>
// tags and every url(...) in the stylesheets — new art is picked up for free.
// ═══════════════════════════════════════════════════════════════════════════

const preloadedImages = [];   // keep references so decoded images stay cached

function collectAssetUrls() {
  const urls = new Set();
  const add = u => { if (u && /(^|\/)assets\//.test(u) && !u.startsWith('data:')) urls.add(u); };

  SYMBOLS.forEach(s => add(s.img));
  document.querySelectorAll('img[src]').forEach(img => add(img.getAttribute('src')));
  document.querySelectorAll('[data-src]').forEach(el => add(el.dataset.src));

  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  const walk = rules => {
    for (const rule of rules) {
      if (rule.cssRules) walk(rule.cssRules);           // @media / @supports blocks
      const text = rule.cssText || '';
      let m;
      while ((m = urlRe.exec(text))) add(m[1]);
    }
  };
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin (Google Fonts)
    if (rules) walk(rules);
  }
  return [...urls];
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.push(img);
      // decode() finishes the PNG decode off the main thread, so the first
      // paint of this image during play costs nothing
      // Browsers pause decoding while the tab is in the background, so never
      // let a pending decode hold up loading for more than a moment.
      const decoded = (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
      Promise.race([decoded, sleep(2500)]).then(() => resolve(url));
    };
    img.onerror = () => reject(url);
    img.src = url;
  });
}

function preloadFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const fonts = Promise.all([
    document.fonts.load('900 1em Cinzel'),
    document.fonts.load('800 1em Cinzel'),
    document.fonts.load('700 1em Philosopher'),
    document.fonts.load('400 1em Philosopher'),
  ]).catch(() => {});
  // Never let a slow font host hold the game hostage
  return Promise.race([fonts, sleep(4000)]);
}

const LOADER_MESSAGES = [
  [0,   'Baiting the hooks…'],
  [25,  'Polishing the treasure chests…'],
  [50,  'Waking up Poseidon…'],
  [75,  'Filling the jackpots…'],
  [100, 'The tide is in!'],
];

function runLoader() {
  const loader  = document.getElementById('loader');
  if (!loader) { state.ready = true; return; }
  const bar     = document.getElementById('loadbar');
  const fill    = document.getElementById('loadbar-fill');
  const coin    = document.getElementById('loadbar-coin');
  const pctEl   = document.getElementById('loader-pct');
  const msgEl   = document.getElementById('loader-msg');
  const startBt = document.getElementById('loader-start');

  let target = 0, shown = 0, rafId = null;
  const minShowUntil = performance.now() + 900;  // long enough to read, short enough not to annoy

  // Smoothly ease the displayed % toward the real %, so the bar glides
  function render() {
    shown += (target - shown) * 0.12;
    if (Math.abs(target - shown) < 0.15) shown = target;
    const p = shown.toFixed(2);
    fill.style.width = p + '%';
    coin.style.left  = p + '%';
    coin.style.transform = `translate(-50%, -50%) rotate(${shown * 7.2}deg)`;
    const whole = Math.floor(shown);
    pctEl.textContent = whole + '%';
    bar.setAttribute('aria-valuenow', whole);
    const msg = [...LOADER_MESSAGES].reverse().find(([at]) => whole >= at);
    if (msg && msgEl.dataset.state !== 'error') msgEl.textContent = msg[1];
    if (shown !== target) rafId = requestAnimationFrame(render); else rafId = null;
  }
  const setTarget = pct => { target = pct; if (!rafId) rafId = requestAnimationFrame(render); };

  async function load(urls) {
    msgEl.dataset.state = '';
    startBt.hidden = true;
    const steps = urls.length + 1;   // +1 for fonts
    let done = 0;
    const tick = () => setTarget(Math.min(99, (++done / steps) * 100));

    const results = await Promise.allSettled([
      ...urls.map(u => preloadImage(u).finally(tick)),
      preloadFonts().finally(tick),
    ]);
    const failed = results.slice(0, urls.length)
      .map((r, i) => r.status === 'rejected' ? urls[i] : null).filter(Boolean);

    if (failed.length) {
      msgEl.dataset.state = 'error';
      msgEl.textContent = `${failed.length} image${failed.length > 1 ? 's' : ''} didn't load. Check your connection and try again.`;
      startBt.textContent = 'RETRY';
      startBt.hidden = false;
      startBt.onclick = () => load(failed);
      return;
    }

    const wait = minShowUntil - performance.now();
    if (wait > 0) await sleep(wait);
    setTarget(100);
    await sleep(450);
    shown = target = 100; render();   // land exactly on 100% before showing the button
    loader.classList.add('ready');
    startBt.textContent = 'TAP TO PLAY';
    startBt.hidden = false;
    startBt.onclick = enterGame;
    startBt.focus({ preventScroll: true });
  }

  function enterGame() {
    loader.classList.add('closing');
    document.body.classList.remove('is-loading');
    state.ready = true;
    setTimeout(() => loader.remove(), 650);
    setTimeout(maybeOfferRefill, 700);   // e.g. came back with an empty saved balance
  }

  load(collectAssetUrls());
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  elBalance      = document.getElementById('balance-value');
  elBet          = document.getElementById('bet-value');
  elLastWin      = document.getElementById('win-value');
  elFreeSpins    = document.getElementById('free-spins-value');
  elStatus       = document.getElementById('status-text');
  elSpinBtn      = document.getElementById('spin-btn');
  elBetMinus     = document.getElementById('bet-minus');
  elBetPlus      = document.getElementById('bet-plus');
  elPaytableBtn  = document.getElementById('paytable-btn');
  elPaytableModal= document.getElementById('paytable-modal');
  elPaytableClose= document.getElementById('paytable-close');

  elBuyFsBtnDesktop = document.getElementById('buy-fs-btn-desktop');
  elBuyFsBtnMobile  = document.getElementById('buy-fs-btn-mobile');
  elBuyFsModal      = document.getElementById('buy-fs-modal');
  elBuyFsCost       = document.getElementById('buy-fs-cost');
  elBuyFsConfirm    = document.getElementById('buy-fs-confirm');
  elBuyFsCancel     = document.getElementById('buy-fs-cancel');

  // Restore saved progress (validated — bad or missing values keep defaults)
  if (Number.isFinite(SAVED.balance) && SAVED.balance >= 0) state.balance = Math.floor(SAVED.balance);
  if (Number.isInteger(SAVED.betIndex) && SAVED.betIndex >= 0 && SAVED.betIndex < CONFIG.betLevels.length) state.betIndex = SAVED.betIndex;
  if (Number.isFinite(SAVED.sessionWin) && SAVED.sessionWin >= 0) state.sessionWin = Math.floor(SAVED.sessionWin);
  if (Number.isInteger(SAVED.speedIndex) && SAVED.speedIndex >= 0 && SAVED.speedIndex < SPEED_LEVELS.length) state.speedIndex = SAVED.speedIndex;

  buildReelGrid();
  buildPaytable();
  startJackpotTickers();

  elBalance.textContent = state.balance.toLocaleString();
  elLastWin.textContent = state.sessionWin.toLocaleString();
  updateBetDisplay();
  updateFreeSpinsDisplay();
  updateBuyFreeSpinsUI();
  setStatus('Welcome to Fishing Fortune Reels · Press SPIN to cast! 🎣');
  wireEvents();
  runLoader();
});
