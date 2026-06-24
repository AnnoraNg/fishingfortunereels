# Fishing Fortune Reels 🎣

A fully-featured 5-reel × 3-row fishing-themed slot machine built entirely in plain HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies — just open `index.html` in a browser and play.

---

## Project Structure

```
fishing-fortune-reels/
├── index.html       Game page — layout, overlays, inline scripts
├── style.css        All styling, animations, responsive breakpoints
├── game.js          Game logic — config, RNG, reels, evaluation, UI
├── README.md        This file
└── assets/          All image assets (symbols, backgrounds, UI)
```

The `assets/` folder contains PNG artwork for all slot symbols, win banners, UI panels, and the ocean background.

---

## Gameplay

### Core mechanics

- **5 reels, 3 rows, 10 paylines** — left-to-right, minimum 3 matching symbols to win.
- **Wild (Golden Net)** — substitutes for any regular symbol on a payline.
- **Scatter (Lucky Lure)** — 3 or more anywhere on the reels triggers free spins and pays a scatter bonus.
- **Free spins** — cost nothing, apply a 2× multiplier to all line wins, and can retrigger if more scatters land.

### Win system

Wins are tiered based on the win-to-bet multiplier:

| Tier | Multiplier | Banner |
|---|---|---|
| BIG WIN | 2× – 9× | Koi fish banner |
| MEGA WIN | 10× – 24× | Giant clam / pearl banner |
| MASSIVE WIN | 25×+ | Marlin / swordfish banner |

Each tier shows a full-width animated banner with a counting number that builds up to the win amount. The banner stays on screen until you press **COLLECT** (or auto-dismisses after 8 seconds).

### Win display

The **TOTAL WIN** counter in the bottom bar accumulates across your entire session — it never resets to zero. Every winning spin adds to the running total so you can see how much you've won overall.

### Early win boost

To get things started, win probability is boosted for the first 10 spins. Spins 3, 7, 13, and 18 are guaranteed wins.

---

## Controls

| Action | How |
|---|---|
| Spin | SPIN button, click anywhere on the reel area, or Spacebar |
| Adjust bet | − / + buttons, or MAX for the highest bet |
| Change speed | **⚡ ×1** button (top-right) — tap to cycle ×1 → ×2 → ×4 |
| Toggle frame | **MODE** button (top-right) — switches between gold frame and transparent mode |
| View paytable | **i** button in the bottom bar |
| Change avatar | Click the profile picture (top-left) — 6 avatars available |

---

## UI Features

### Ocean background
Animated deep-sea background with continuously scrolling sunlight shafts, floating ambient bubbles, and a slow breathing brightness effect.

### Gold frame mode
The reel area is framed in a layered gold metallic border with corner gems and pearl dot accents. Toggle to **transparent mode** for a frosted glass look that lets the ocean scene show through unobstructed.

### Jackpot bar
Four live jackpot tickers (GRAND / MAJOR / MINOR / MINI) sit above the reels and slowly count up in real time. Accessible on mobile via the ☰ menu drawer.

### Profile avatar
A circular avatar button floats top-left. Tap to open a picker with 6 character options.

### Speed control
The **⚡ ×1 / ×2 / ×4** button scales the entire spin sequence — reel scroll speed, stagger between reels, and total stop time — so higher speeds complete each spin proportionally faster.

### Win particles
Coin and bubble particles burst from the reels on any win. Particle count scales with win size.

---

## Responsive Design

The layout adapts across screen sizes:

| Screen | Behaviour |
|---|---|
| Desktop (≥ 900px) | Full layout — jackpot bar, title, all controls in one row |
| Tablet (≤ 899px) | Slightly smaller reels and UI elements |
| Large mobile (≤ 599px) | Bottom bar wraps into two rows; jackpot bar and payline info move into the ☰ drawer; speed and mode buttons hidden |
| Small mobile (≤ 479px) | Game title hidden; further compression |
| Very small (≤ 380px) | Balance hidden (visible in drawer); maximum compression |
| Short viewport (height ≤ 700px) | Jackpot bar hidden |
| Very short (height ≤ 580px) | Title and status bar hidden |

---

## Configuration (`game.js` → `CONFIG`)

| Key | Default | Description |
|---|---|---|
| `startingBalance` | 15,000,000 | Starting coins — enough for 30 max bets |
| `betLevels` | [10k, 20k, 50k, 100k, 200k, 500k] | Available bet sizes |
| `defaultBetIndex` | 1 | Bet selected on load (20,000) |
| `reelSpeed` | 14 cells/s | Scroll speed during spin (×1 speed) |
| `reelStagger` | 300 ms | Delay between each reel stopping left → right |
| `lastReelStop` | 2800 ms | Time until the last reel stops (×1 speed) |

### Symbol weights and payouts

In `game.js`, find the `SYMBOLS` array near the top:

```js
{ id: 'crab', weight: 18, payouts: { 3: 0.25, 4: 0.7, 5: 1.5 } }
```

- **`weight`** — relative frequency. Higher = appears more often.
- **`payouts`** — bet multiplier for 3, 4, or 5 matching symbols on a payline.

Scatter payouts are set inside `evaluateWins()`. Free-spin counts and the win multiplier are in the `freeSpins` block in `CONFIG`.
