# Fishing Fortune Reels 🎣

A polished 5-reel × 3-row fishing-themed slot machine built with plain HTML, CSS, and JavaScript — no build tools required.

---

## How to Regenerate Sprites

Sprites are generated from SVG source using Python and ImageMagick.

**Requirements:**
- Python 3 (stdlib only — no extra packages)
- ImageMagick (`convert` command, version 6 or 7)

```bash
python3 generate_assets.py
```

This writes all 12 PNG files into `assets/`. Re-run any time you want to tweak artwork.

The legacy `generate_assets.js` (Node.js / canvas) is also included but requires the `canvas` native npm package, which needs a full build environment.

---

## Project Structure

```
fishing-fortune-reels/
├── index.html            Main game page
├── style.css             All styling
├── game.js               Game logic (config, RNG, evaluation, animation, UI)
├── generate_assets.py    Sprite generator (Python + ImageMagick)
├── generate_assets.js    Alternative generator (Node.js + canvas)
├── README.md             This file
└── assets/
    ├── small_fish.png
    ├── big_fish.png
    ├── crab.png
    ├── octopus.png
    ├── pearl_shell.png
    ├── anchor.png
    ├── fishing_hook.png
    ├── treasure_chest.png
    ├── wild_golden_net.png
    ├── scatter_lucky_lure.png
    ├── background_ocean.png
    └── slot_frame.png
```

---

## Where to Adjust Probabilities

In `game.js`, find the `SYMBOLS` array near the top:

```js
const SYMBOLS = [
  { id: 'small_fish', ..., weight: 22,  payouts: { 3: 0.2, 4: 0.6, 5: 1.2 } },
  { id: 'crab',       ..., weight: 18,  payouts: { 3: 0.25, ... } },
  ...
];
```

- **`weight`** — higher = more frequent. Weights are relative; the total doesn't need to sum to any specific value. Each symbol is sampled proportionally.
- **`payouts`** — multiplier of total bet for 3, 4, or 5-of-a-kind on a payline.

---

## Where to Adjust Payouts

Same `SYMBOLS` array — the `payouts` object. Keys are match count (3/4/5), values are bet multipliers.

**Scatter payouts** are defined inline in `evaluateWins()` in `game.js`:
```js
const scatterPayouts = { 3: 2, 4: 5, 5: 20 };
```

**Free-spin settings** are in the `CONFIG` object at the top of `game.js`:
```js
freeSpins: {
  scatter3: { spins: 5,  multiplier: 2 },
  scatter4: { spins: 8,  multiplier: 2 },
  scatter5: { spins: 12, multiplier: 2 },
},
```

---

## Other Config Options (`game.js` → `CONFIG`)

| Key              | Default  | Description                                    |
|------------------|----------|------------------------------------------------|
| `startingBalance`| 10,000   | Player's starting coins                        |
| `betLevels`      | [50,100,200,500,1000] | Available bet sizes                |
| `defaultBetIndex`| 1        | Which bet is selected on start (index into array) |
| `spinDuration`   | 2800 ms  | How long until the last reel stops             |
| `reelStagger`    | 320 ms   | Extra delay between each reel stopping (L→R)  |

---

## Gameplay Summary

- **5 reels, 3 rows, 10 paylines** — left-to-right, minimum 3 matching symbols.
- **Wild (Golden Net)** — substitutes for any regular symbol; does not count as Scatter.
- **Scatter (Lucky Lure)** — 3+ anywhere trigger free spins plus a scatter coin payout.
- **Free spins** — do not cost coins, apply a 2× multiplier to all line wins, and can retrigger.
- **Balance counting animation** — balance counts up on win.
- **Coin/bubble particles** — burst on win; bubble burst on scatter trigger.
- **Keyboard shortcut** — Spacebar = Spin.
