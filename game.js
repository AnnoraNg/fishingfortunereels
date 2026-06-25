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

  freeSpins: {
    scatter3: { spins: 5,  multiplier: 2 },
    scatter4: { spins: 8,  multiplier: 2 },
    scatter5: { spins: 12, multiplier: 2 },
  },
};

// ── Symbols ─────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id:'small_fish',         label:'Small Fish',     img:'assets/small_fish.png',         weight:22,  payouts:{3:0.2, 4:0.6, 5:1.2 } },
  { id:'crab',               label:'Crab',           img:'assets/crab.png',               weight:18,  payouts:{3:0.25,4:0.7, 5:1.5 } },
  { id:'anchor',             label:'Anchor',         img:'assets/anchor.png',             weight:16,  payouts:{3:0.3, 4:0.8, 5:1.8 } },
  { id:'big_fish',           label:'Big Fish',       img:'assets/big_fish.png',           weight:14,  payouts:{3:0.4, 4:1.0, 5:2.5 } },
  { id:'pearl_shell',        label:'Pearl Shell',    img:'assets/pearl_shell.png',        weight:11,  payouts:{3:0.5, 4:1.3, 5:3.0 } },
  { id:'fishing_hook',       label:'Fishing Hook',   img:'assets/fishing_hook.png',       weight:9,   payouts:{3:0.6, 4:1.5, 5:4.0 } },
  { id:'octopus',            label:'Octopus',        img:'assets/octopus.png',            weight:5,   payouts:{3:0.8, 4:2.5, 5:6.0 } },
  { id:'treasure_chest',     label:'Treasure Chest', img:'assets/treasure_chest.png',     weight:3,   payouts:{3:1.5, 4:5.0, 5:12.0} },
  { id:'wild_golden_net',    label:'Wild',           img:'assets/wild_golden_net.png',    weight:1.5, payouts:null, isWild:true    },
  { id:'scatter_lucky_lure', label:'Scatter',        img:'assets/scatter_lucky_lure.png', weight:0.5, payouts:null, isScatter:true },
];

const SYMBOL_POOL = [];
SYMBOLS.forEach(s => {
  const n = Math.round(s.weight * 10);
  for (let i = 0; i < n; i++) SYMBOL_POOL.push(s.id);
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
  [0,1,2,1,0],  // 6  (same pattern as 4)
  [2,1,0,1,2],  // 7  (same pattern as 5)
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
  spinCount : 0,    // tracks total spins for early win boost
};

// ═══════════════════════════════════════════════════════════════════════════
// RNG
// ═══════════════════════════════════════════════════════════════════════════

function randomSymbol() {
  return SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
}

function generateGrid() {
  return Array.from({ length: CONFIG.reels }, () =>
    Array.from({ length: CONFIG.rows }, () => randomSymbol())
  );
}

// Mid-tier symbols used for win boosts (not wild/scatter)
const BOOST_SYMBOLS = ['crab', 'anchor', 'big_fish', 'pearl_shell'];

// Spins that are always guaranteed a win
const GUARANTEED_SPINS = new Set([3, 7, 13, 18]);

function generateBoostedGrid() {
  const grid = generateGrid();
  const n = state.spinCount;

  // Spins 1-4:  guaranteed win — 3-of-a-kind, 50% chance extends to 4-of-a-kind
  // Spins 5-7:  90% chance of a forced 3-match
  // Spins 8-10: 65% chance of a forced 3-match
  // Specific spins (3, 7, 13, 18): always guaranteed
  // After spin 10 (outside guaranteed set): normal RNG
  let forceWin = false;
  if      (GUARANTEED_SPINS.has(n)) forceWin = true;
  else if (n <= 4)                  forceWin = true;
  else if (n <= 7)                  forceWin = Math.random() < 0.90;
  else if (n <= 10)                 forceWin = Math.random() < 0.65;

  if (forceWin) {
    const sym = BOOST_SYMBOLS[Math.floor(Math.random() * BOOST_SYMBOLS.length)];
    grid[0][1] = sym;
    grid[1][1] = sym;
    grid[2][1] = sym;
    // 50% chance to extend to 4-of-a-kind on guaranteed spins and first 4 spins
    if ((GUARANTEED_SPINS.has(n) || n <= 4) && Math.random() < 0.50) grid[3][1] = sym;
  }

  return grid;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

function evalPayline(grid, payline) {
  let baseId = null, count = 0;
  for (let col = 0; col < CONFIG.reels; col++) {
    const sym = SYM_BY_ID[grid[col][payline[col]]];
    if (sym.isScatter) break;
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
    const scPay  = { 3:2,  4:5,  5:20 };
    const scSpin = { 3:CONFIG.freeSpins.scatter3.spins,
                     4:CONFIG.freeSpins.scatter4.spins,
                     5:CONFIG.freeSpins.scatter5.spins };
    const k = Math.min(sc, 5);
    totalWin  += Math.floor(bet * (scPay[k]||20) * multiplier);
    bonusSpins = scSpin[k] || 5;
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
    elPaytableBtn, elPaytableModal, elPaytableClose;

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
function spinReel(colIndex, finalSymbols, stopDelay) {
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
    const sym = SYM_BY_ID[randomSymbol()];
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
      last.querySelector('img').src = SYM_BY_ID[randomSymbol()].img;
      strip.prepend(last);
      cells.unshift(last);
    }

    strip.style.transform = `translateY(${yOff}px)`;
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // ── Stop & settle ────────────────────────────────────────────────────
  return new Promise(resolve => {
    setTimeout(() => {
      // Halt the RAF loop
      active = false;
      cancelAnimationFrame(rafId);

      // Flush any pending recycles so yOff < 0
      while (yOff >= 0) {
        yOff -= cellH;
        const last = cells.pop();
        last.querySelector('img').src = SYM_BY_ID[randomSymbol()].img;
        strip.prepend(last);
        cells.unshift(last);
      }

      // Place the final symbols in cells[0], [1], [2]
      // They will become visible as the strip eases to translateY(0)
      finalSymbols.forEach((symId, row) => {
        const sym = SYM_BY_ID[symId];
        cells[row].querySelector('img').src = sym.img;
        cells[row].querySelector('img').alt = sym.label;
      });

      // Ease yOff → 0  (remaining scroll distance is -yOff, always positive)
      const startY  = yOff;   // negative value (e.g. -0.4 * cellH)
      const startTs = performance.now();
      const DUR     = 420;    // settle duration in ms

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

    }, stopDelay);
  });
}

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
  if (state.spinning) return;

  const isFree = state.freeSpins > 0;
  const bet    = CONFIG.betLevels[state.betIndex];

  if (!isFree && state.balance < bet) {
    setStatus('⚠️  Not enough coins — lower your bet.');
    return;
  }

  state.spinning = true;
  clearWinEffects();
  setStatus(isFree ? `🎁 Free Spin! (${state.freeSpins} remaining)` : '🎣 Reeling in…');
  elSpinBtn.disabled = elBetMinus.disabled = elBetPlus.disabled = true;

  if (!isFree) {
    const prev = state.balance;
    state.balance -= bet;
    animateNumber(elBalance, prev, state.balance, 250);
  } else {
    state.freeSpins--;
    updateFreeSpinsDisplay();
  }

  // Outcome — use boosted grid for early spins
  state.spinCount++;
  const grid = generateBoostedGrid();
  state.grid = grid;

  // Spin all reels; left reel stops first, right reel stops last
  // Timing is divided by the speed multiplier so higher speeds finish faster
  const sm       = SPEED_LEVELS[state.speedIndex].mult;
  const stagger  = CONFIG.reelStagger  / sm;
  const lastStop = CONFIG.lastReelStop / sm;
  const firstStop = lastStop - (CONFIG.reels - 1) * stagger;
  const ps = [];
  for (let col = 0; col < CONFIG.reels; col++) {
    ps.push(spinReel(col, grid[col], firstStop + col * stagger));
  }
  await Promise.all(ps);

  // Evaluate
  const mult = isFree ? CONFIG.freeSpins.scatter3.multiplier : 1;
  const { totalWin, winLines, winCells, bonusSpins, triggerScatter } =
    evaluateWins(grid, bet, mult);

  state.lastWin  = totalWin;
  state.winLines = winLines;

  if (totalWin > 0) {
    applyWinEffects(winCells, winLines);
    const prev = state.balance;
    state.balance += totalWin;
    animateNumber(elBalance, prev, state.balance, 800);
    // Accumulate session win and animate from previous total to new total
    const prevSession = state.sessionWin;
    state.sessionWin += totalWin;
    animateNumber(elLastWin, prevSession, state.sessionWin, 650);
    spawnCoins(Math.min(8 + Math.floor(totalWin / bet * 2), 28));
    // Win overlay: trigger for any win ≥ 2× the bet
    if (totalWin >= bet * 2) {
      setTimeout(() => showWinOverlay(totalWin, bet), 600);
    }
  }
  // No win — keep displaying accumulated session total (don't reset to 0)

  if (triggerScatter) {
    spawnBubbles();
    state.freeSpins += bonusSpins;
    updateFreeSpinsDisplay();
    setStatus(isFree
      ? `🌊 Retriggered! +${bonusSpins} Free Spins! Win: ${totalWin.toLocaleString()}`
      : `🎉 SCATTER! ${bonusSpins} Free Spins unlocked! Win: ${totalWin.toLocaleString()}`);
  } else if (totalWin > 0) {
    setStatus(`✨ Win: +${totalWin.toLocaleString()}  —  ` +
      winLines.map(w => `L${w.line}: +${w.amount.toLocaleString()}`).join(' · '));
  } else if (isFree) {
    setStatus(state.freeSpins > 0 ? `Free spin · no win · ${state.freeSpins} left` : '🏁 Free Spins complete!');
  } else {
    setStatus('No win this time. Cast again!');
  }

  updateSpinButton();
  state.spinning = false;
  elSpinBtn.disabled  = false;
  elBetMinus.disabled = state.freeSpins > 0;
  elBetPlus.disabled  = state.freeSpins > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function setStatus(msg) { elStatus.textContent = msg; }

// ── Win Celebration Overlay ───────────────────────────────────────────────
let _winOverlayTimer = null;

function showWinOverlay(amount, bet) {
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
  tierLabel.textContent = label;
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

  // Animate amount counter (counts up over ~2s)
  const duration = 2000;
  const startTs  = performance.now();
  function tick(now) {
    const t = Math.min((now - startTs) / duration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    amountEl.textContent = Math.floor(ease * amount).toLocaleString();
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      amountEl.textContent = amount.toLocaleString();
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
  }, 500);
}

function updateBetDisplay() {
  const bet = CONFIG.betLevels[state.betIndex];
  elBet.textContent = bet.toLocaleString();
  document.getElementById('bet-value-ctrl').textContent = bet.toLocaleString();
  elBetMinus.disabled = state.betIndex === 0 || state.freeSpins > 0;
  elBetPlus.disabled  = state.betIndex === CONFIG.betLevels.length - 1 || state.freeSpins > 0;
}

function updateFreeSpinsDisplay() {
  elFreeSpins.textContent = state.freeSpins;
  document.getElementById('free-spins-row').style.display = state.freeSpins > 0 ? 'flex' : 'none';
  updateSpinButton();
}

function updateSpinButton() {
  if (state.freeSpins > 0) {
    elSpinBtn.textContent = '🎁 FREE SPIN';
    elSpinBtn.classList.add('free-spin-mode');
  } else {
    elSpinBtn.textContent = '⚡ SPIN';
    elSpinBtn.classList.remove('free-spin-mode');
  }
}

function buildPaytable() {
  document.getElementById('paytable-body').innerHTML = SYMBOLS.map(s => {
    const pay = s.isWild ? 'Substitutes for all regular symbols'
              : s.isScatter
                ? '3 anywhere: 2× + 5 Free Spins<br>4 anywhere: 5× + 8 Free Spins<br>5 anywhere: 20× + 12 Free Spins'
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
      const sym = SYM_BY_ID[randomSymbol()];
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
  elSpinBtn.addEventListener('click', doSpin);

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
      applySpeed();
    });
  }
  if (mobileSpeedBtn) {
    mobileSpeedBtn.addEventListener('click', () => {
      state.speedIndex = (state.speedIndex + 1) % SPEED_LEVELS.length;
      applySpeed();
    });
  }

  // Clicking anywhere on the reel board also triggers spin
  const elBoard = document.getElementById('game-board');
  if (elBoard) {
    elBoard.addEventListener('click', () => {
      if (!elSpinBtn.disabled) doSpin();
    });
    elBoard.style.cursor = 'pointer';
  }
  elBetMinus.addEventListener('click', () => {
    if (state.betIndex > 0) { state.betIndex--; updateBetDisplay(); }
  });
  elBetPlus.addEventListener('click', () => {
    if (state.betIndex < CONFIG.betLevels.length - 1) { state.betIndex++; updateBetDisplay(); }
  });
  function openPaytable()  { elPaytableModal.classList.add('open');    document.body.classList.add('paytable-open'); }
  function closePaytable() { elPaytableModal.classList.remove('open'); document.body.classList.remove('paytable-open'); }

  elPaytableBtn.addEventListener('click', openPaytable);
  elPaytableClose.addEventListener('click', closePaytable);
  elPaytableModal.addEventListener('click', e => { if (e.target === elPaytableModal) closePaytable(); });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !elSpinBtn.disabled) { e.preventDefault(); doSpin(); }
  });

  // Max-bet button
  const maxBetBtn = document.getElementById('max-bet-btn');
  if (maxBetBtn) {
    maxBetBtn.addEventListener('click', () => {
      if (!state.spinning && state.freeSpins === 0) {
        state.betIndex = CONFIG.betLevels.length - 1;
        updateBetDisplay();
      }
    });
  }
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

  buildReelGrid();
  buildPaytable();

  elBalance.textContent = state.balance.toLocaleString();
  elLastWin.textContent = '0';
  updateBetDisplay();
  updateFreeSpinsDisplay();
  setStatus('Welcome to Fishing Fortune Reels · Press SPIN to cast! 🎣');
  wireEvents();
});
