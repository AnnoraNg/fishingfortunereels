/**
 * generate_assets.js
 * Generates all sprite PNG files for Fishing Fortune Reels.
 * Run: node generate_assets.js
 * Requires: npm install canvas
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const OUT = path.join(__dirname, 'assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function save(canvas, name) {
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  ✓  ${name}`);
}

function make(drawFn, name) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawFn(ctx, SIZE);
  save(canvas, name);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function outline(ctx, color = '#1a3a5c', width = 5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function shadow(ctx, color = 'rgba(0,0,0,0.35)', blur = 10, ox = 3, oy = 4) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy;
}

function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function radialGrad(ctx, cx, cy, r0, r1, stops) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}

function linearGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}

// ─── 1. Small Fish ───────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2;

  // body
  ctx.save();
  shadow(ctx);
  ctx.beginPath();
  ctx.ellipse(cx - 10, cy, 80, 48, 0, 0, Math.PI * 2);
  const bodyGrad = linearGrad(ctx, cx - 90, cy - 48, cx - 90, cy + 48, [
    [0, '#7de8ff'],
    [0.45, '#29b6e8'],
    [1, '#0077aa'],
  ]);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#005577', 4);
  ctx.stroke();
  ctx.restore();

  // scales
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - 30 + i * 22, cy + 5, 13, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // tail
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + 68, cy);
  ctx.lineTo(cx + 110, cy - 40);
  ctx.lineTo(cx + 100, cy);
  ctx.lineTo(cx + 110, cy + 40);
  ctx.closePath();
  ctx.fillStyle = '#29b6e8';
  ctx.fill();
  outline(ctx, '#005577', 4);
  ctx.stroke();
  ctx.restore();

  // fin top
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy - 46);
  ctx.quadraticCurveTo(cx, cy - 80, cx + 20, cy - 46);
  ctx.closePath();
  ctx.fillStyle = '#5dd4f0';
  ctx.fill();
  outline(ctx, '#005577', 3);
  ctx.stroke();
  ctx.restore();

  // eye
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx - 65, cy - 12, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  outline(ctx, '#003355', 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 68, cy - 12, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  // shine
  ctx.beginPath();
  ctx.arc(cx - 71, cy - 16, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  // mouth
  ctx.beginPath();
  ctx.arc(cx - 82, cy + 8, 8, 0, Math.PI);
  ctx.strokeStyle = '#003355';
  ctx.lineWidth = 3;
  ctx.stroke();
}, 'small_fish.png');

// ─── 2. Big Fish ─────────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2;

  // body – deep sea tuna style
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.4)', 14, 4, 6);
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy, 95, 60, -0.12, 0, Math.PI * 2);
  const bg = linearGrad(ctx, cx - 100, cy - 60, cx - 100, cy + 60, [
    [0, '#e8f8ff'],
    [0.3, '#5bc8dc'],
    [0.65, '#2266aa'],
    [1, '#0a2244'],
  ]);
  ctx.fillStyle = bg;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#0a2244', 5);
  ctx.stroke();
  ctx.restore();

  // lateral line
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy);
  ctx.quadraticCurveTo(cx, cy - 18, cx + 65, cy);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // scales
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.beginPath();
      ctx.arc(cx - 50 + col * 30, cy + row * 18 - 5, 16, Math.PI, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // tail
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + 80, cy);
  ctx.lineTo(cx + 118, cy - 50);
  ctx.lineTo(cx + 108, cy);
  ctx.lineTo(cx + 118, cy + 50);
  ctx.closePath();
  ctx.fillStyle = '#2266aa';
  ctx.fill();
  outline(ctx, '#0a2244', 5);
  ctx.stroke();
  ctx.restore();

  // dorsal fin
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - 57);
  ctx.quadraticCurveTo(cx + 5, cy - 100, cx + 40, cy - 57);
  ctx.closePath();
  ctx.fillStyle = '#3377bb';
  ctx.fill();
  outline(ctx, '#0a2244', 4);
  ctx.stroke();
  ctx.restore();

  // pectoral fin
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy + 20);
  ctx.quadraticCurveTo(cx - 10, cy + 70, cx + 20, cy + 55);
  ctx.quadraticCurveTo(cx + 25, cy + 25, cx - 20, cy + 20);
  ctx.fillStyle = '#3377bb';
  ctx.fill();
  outline(ctx, '#0a2244', 3);
  ctx.stroke();
  ctx.restore();

  // eye
  ctx.beginPath();
  ctx.arc(cx - 72, cy - 15, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  outline(ctx, '#0a2244', 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 75, cy - 15, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ctx.canvas.width / 2 - 79, cy - 19, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}, 'big_fish.png');

// ─── 3. Crab ─────────────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2 + 10;

  function claw(ctx, x, y, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 20, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#e84040';
    ctx.fill();
    outline(ctx, '#8b0000', 4);
    ctx.stroke();
    // pincer top
    ctx.beginPath();
    ctx.ellipse(22, -14, 18, 10, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#e84040';
    ctx.fill();
    outline(ctx, '#8b0000', 3);
    ctx.stroke();
    // pincer bottom
    ctx.beginPath();
    ctx.ellipse(22, 5, 15, 8, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#cc3030';
    ctx.fill();
    outline(ctx, '#8b0000', 3);
    ctx.stroke();
    ctx.restore();
  }

  // legs (draw behind body)
  const legColors = ['#e84040', '#c83030'];
  for (let i = 0; i < 3; i++) {
    const lx = cx - 30 + i * 22;
    // left legs
    ctx.beginPath();
    ctx.moveTo(lx, cy + 15);
    ctx.lineTo(lx - 28 + i * 5, cy + 60);
    ctx.strokeStyle = '#c83030';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();
    // right legs
    ctx.beginPath();
    ctx.moveTo(lx + 40, cy + 15);
    ctx.lineTo(lx + 65 - i * 5, cy + 60);
    ctx.stroke();
  }

  // body
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.4)', 12, 3, 5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 75, 52, 0, 0, Math.PI * 2);
  const bg = radialGrad(ctx, cx - 20, cy - 15, 5, 75, [
    [0, '#ff8080'],
    [0.5, '#e84040'],
    [1, '#8b0000'],
  ]);
  ctx.fillStyle = bg;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#8b0000', 5);
  ctx.stroke();
  ctx.restore();

  // shell ridges
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, 15 + i * 15, 8 + i * 10, 0, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255,200,180,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // claws
  claw(ctx, cx - 90, cy - 20, 1);
  claw(ctx, cx + 90, cy - 20, -1);

  // eyes on stalks
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 22, cy - 48);
    ctx.lineTo(cx + s * 28, cy - 70);
    ctx.strokeStyle = '#c83030';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 28, cy - 74, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    outline(ctx, '#8b0000', 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 29, cy - 75, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }

  // smile
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 22, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = 3.5;
  ctx.stroke();
}, 'crab.png');

// ─── 4. Octopus ──────────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2 - 10;

  // tentacles first
  const tentacleBase = [
    [-55, 30], [-38, 35], [-18, 38], [5, 38],
    [28, 35], [48, 30], [62, 20], [-70, 15],
  ];
  tentacleBase.forEach(([ox, oy], i) => {
    const tx = cx + ox;
    const ty = cy + oy;
    const curl = (i % 2 === 0) ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(
      tx + curl * 20, ty + 40,
      tx - curl * 10, ty + 80,
      tx + curl * 15, ty + 100
    );
    ctx.strokeStyle = '#7b2daa';
    ctx.lineWidth = 14 - i * 0.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    // suckers
    for (let s = 0; s < 3; s++) {
      const t = 0.3 + s * 0.25;
      const sx = tx + curl * (20 * t - 10 * t) + curl * 5 * Math.sin(t * 8);
      const sy = ty + t * 90;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a0ff';
      ctx.fill();
    }
  });

  // head/mantle
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.4)', 14, 3, 6);
  ctx.beginPath();
  ctx.ellipse(cx, cy - 15, 72, 80, 0, 0, Math.PI * 2);
  const hg = radialGrad(ctx, cx - 20, cy - 35, 8, 85, [
    [0, '#d07aff'],
    [0.5, '#9b35dd'],
    [1, '#4a0e7a'],
  ]);
  ctx.fillStyle = hg;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#3a0060', 5);
  ctx.stroke();
  ctx.restore();

  // head spots
  [[cx - 20, cy - 30], [cx + 25, cy - 10], [cx - 10, cy + 15]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,160,255,0.4)';
    ctx.fill();
  });

  // eyes
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.arc(cx + s * 28, cy - 25, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#f0e0ff';
    ctx.fill();
    outline(ctx, '#3a0060', 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 30, cy - 25, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + s * 27, cy - 29, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // beak
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 12, 0, Math.PI);
  ctx.fillStyle = '#f7c500';
  ctx.fill();
  outline(ctx, '#a06000', 3);
  ctx.stroke();
}, 'octopus.png');

// ─── 5. Pearl Shell ──────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2 + 10;

  // outer shell bottom
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.35)', 12, 3, 5);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 88, 60, 0, 0, Math.PI * 2);
  const sg = linearGrad(ctx, cx, cy - 50, cx, cy + 70, [
    [0, '#f7d0a0'],
    [0.4, '#e8aa60'],
    [1, '#b06020'],
  ]);
  ctx.fillStyle = sg;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#7a3c00', 5);
  ctx.stroke();
  ctx.restore();

  // inner shell (open)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 82, 54, 0, Math.PI, 0);
  const ig = linearGrad(ctx, cx, cy - 55, cx, cy + 10, [
    [0, '#fff5ee'],
    [0.4, '#ffd8e8'],
    [0.7, '#ffb8d4'],
    [1, '#e88aaa'],
  ]);
  ctx.fillStyle = ig;
  ctx.fill();
  outline(ctx, '#7a3c00', 4);
  ctx.stroke();

  // shell ridges
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx - 80 + i * 14, cy + 30);
    ctx.strokeStyle = 'rgba(200,120,100,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // pearl
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.3)', 10, 2, 4);
  ctx.beginPath();
  ctx.arc(cx, cy - 15, 34, 0, Math.PI * 2);
  const pg = radialGrad(ctx, cx - 10, cy - 25, 3, 34, [
    [0, '#ffffff'],
    [0.3, '#f0f0ff'],
    [0.7, '#d8d8f8'],
    [1, '#aaaacc'],
  ]);
  ctx.fillStyle = pg;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#8888aa', 3);
  ctx.stroke();
  // pearl shine
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 26, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  ctx.restore();
}, 'pearl_shell.png');

// ─── 6. Anchor ───────────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2;

  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.4)', 12, 3, 5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const anchorGrad = linearGrad(ctx, cx - 20, cy - 100, cx + 20, cy + 100, [
    [0, '#d4af37'],
    [0.3, '#f0d060'],
    [0.6, '#c8900a'],
    [1, '#7a5000'],
  ]);

  // shaft
  ctx.beginPath();
  ctx.moveTo(cx, cy - 90);
  ctx.lineTo(cx, cy + 60);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 20;
  ctx.stroke();
  clearShadow(ctx);
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // ring at top
  ctx.beginPath();
  ctx.arc(cx, cy - 90, 22, 0, Math.PI * 2);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // cross bar
  ctx.beginPath();
  ctx.moveTo(cx - 55, cy - 50);
  ctx.lineTo(cx + 55, cy - 50);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // curved bottom
  ctx.beginPath();
  ctx.arc(cx, cy + 30, 40, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // left arm
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy + 52);
  ctx.lineTo(cx - 60, cy + 42);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // right arm
  ctx.beginPath();
  ctx.moveTo(cx + 38, cy + 52);
  ctx.lineTo(cx + 60, cy + 42);
  ctx.strokeStyle = anchorGrad;
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = '#7a5000';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();

  // rope coil
  ctx.beginPath();
  ctx.arc(cx, cy - 90, 16, Math.PI * 0.2, Math.PI * 1.9);
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 5;
  ctx.stroke();
}, 'anchor.png');

// ─── 7. Fishing Hook ─────────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2 + 10, cy = S / 2;

  const hg = linearGrad(ctx, cx - 20, cy - 100, cx + 20, cy + 80, [
    [0, '#e8e8f8'],
    [0.4, '#c0c8e0'],
    [0.7, '#8899bb'],
    [1, '#445566'],
  ]);

  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.35)', 10, 3, 4);
  ctx.lineWidth = 16;
  ctx.strokeStyle = hg;
  ctx.lineCap = 'round';

  // shank (vertical part)
  ctx.beginPath();
  ctx.moveTo(cx, cy - 100);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();

  // bend
  ctx.beginPath();
  ctx.arc(cx - 28, cy + 20, 28, 0, Math.PI * 0.9);
  ctx.stroke();

  clearShadow(ctx);

  // outline over
  ctx.strokeStyle = '#223344';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 100);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 28, cy + 20, 28, 0, Math.PI * 0.9);
  ctx.stroke();

  ctx.restore();

  // barb point
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 55, cy + 38);
  ctx.lineTo(cx - 38, cy + 15);
  ctx.lineTo(cx - 22, cy + 32);
  ctx.fillStyle = hg;
  ctx.fill();
  outline(ctx, '#223344', 3);
  ctx.stroke();
  ctx.restore();

  // fishing line (string at top)
  ctx.beginPath();
  ctx.moveTo(cx, cy - 100);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + (i % 2 === 0 ? -8 : 8), cy - 100 - 12 - i * 10);
  }
  ctx.strokeStyle = '#aabbcc';
  ctx.lineWidth = 3;
  ctx.stroke();

  // eyelet ring
  ctx.beginPath();
  ctx.arc(cx, cy - 100, 10, 0, Math.PI * 2);
  ctx.strokeStyle = hg;
  ctx.lineWidth = 10;
  ctx.stroke();
  outline(ctx, '#223344', 2.5);
  ctx.stroke();
}, 'fishing_hook.png');

// ─── 8. Treasure Chest ───────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2 + 10;
  const w = 150, h = 80, lid = 55;
  const x0 = cx - w / 2, y0 = cy - h / 2 + 10;

  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.45)', 14, 4, 6);

  // chest body
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, [0, 0, 12, 12]);
  const bodyG = linearGrad(ctx, cx, y0, cx, y0 + h, [
    [0, '#8b5a1a'],
    [0.5, '#6b3e0e'],
    [1, '#4a2500'],
  ]);
  ctx.fillStyle = bodyG;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#2a1200', 4);
  ctx.stroke();

  // horizontal band on body
  ctx.beginPath();
  ctx.rect(x0, y0 + h * 0.4, w, h * 0.22);
  ctx.fillStyle = '#c8830a';
  ctx.fill();
  outline(ctx, '#7a4400', 2);
  ctx.stroke();

  // chest lid
  ctx.beginPath();
  ctx.roundRect(x0, y0 - lid, w, lid, [12, 12, 0, 0]);
  const lidG = linearGrad(ctx, cx, y0 - lid, cx, y0, [
    [0, '#b06020'],
    [0.5, '#8b4e10'],
    [1, '#6b3c0a'],
  ]);
  ctx.fillStyle = lidG;
  ctx.fill();
  outline(ctx, '#2a1200', 4);
  ctx.stroke();

  // lid band
  ctx.beginPath();
  ctx.rect(x0, y0 - lid + lid * 0.55, w, lid * 0.22);
  ctx.fillStyle = '#c8830a';
  ctx.fill();
  outline(ctx, '#7a4400', 2);
  ctx.stroke();

  // gold lock
  ctx.beginPath();
  ctx.arc(cx, y0 + 5, 18, 0, Math.PI * 2);
  const lockG = radialGrad(ctx, cx - 5, y0 - 2, 2, 18, [
    [0, '#ffe060'],
    [0.5, '#f0c020'],
    [1, '#c08000'],
  ]);
  ctx.fillStyle = lockG;
  ctx.fill();
  outline(ctx, '#7a5000', 3.5);
  ctx.stroke();

  // keyhole
  ctx.beginPath();
  ctx.arc(cx, y0 + 3, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2000';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 5, y0 + 8);
  ctx.lineTo(cx + 5, y0 + 8);
  ctx.lineTo(cx + 3, y0 + 18);
  ctx.lineTo(cx - 3, y0 + 18);
  ctx.closePath();
  ctx.fillStyle = '#3a2000';
  ctx.fill();

  // corner rivets
  [[x0 + 12, y0 - lid + 10], [x0 + w - 12, y0 - lid + 10],
   [x0 + 12, y0 + h - 12], [x0 + w - 12, y0 + h - 12]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c020';
    ctx.fill();
    outline(ctx, '#7a5000', 2);
    ctx.stroke();
  });

  // glowing coins spilling out
  const coins = [[cx - 35, y0 - lid - 12], [cx, y0 - lid - 18], [cx + 32, y0 - lid - 10],
                 [cx - 20, y0 - lid - 28], [cx + 18, y0 - lid - 30]];
  coins.forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(rx, ry, 13, 9, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe060';
    ctx.fill();
    outline(ctx, '#c08000', 2);
    ctx.stroke();
  });

  ctx.restore();
}, 'treasure_chest.png');

// ─── 9. Wild – Golden Net ─────────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2;

  // glow halo
  const halo = radialGrad(ctx, cx, cy, 20, 110, [
    [0, 'rgba(255,220,50,0.5)'],
    [0.6, 'rgba(255,180,0,0.2)'],
    [1, 'rgba(255,150,0,0)'],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  // net background circle
  ctx.save();
  shadow(ctx, 'rgba(200,150,0,0.5)', 18, 0, 0);
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,60,20,0.2)';
  ctx.fill();
  clearShadow(ctx);
  ctx.restore();

  // draw net grid (polar style)
  const rings = 5, spokes = 10;
  ctx.strokeStyle = '#f0c820';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#ffe060';
  ctx.shadowBlur = 5;

  // radial spokes
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 88, cy + Math.sin(angle) * 88);
    ctx.stroke();
  }

  // concentric rings
  for (let r = 1; r <= rings; r++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r / rings) * 88, 0, Math.PI * 2);
    ctx.stroke();
  }

  clearShadow(ctx);

  // outline circle
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4a010';
  ctx.lineWidth = 6;
  ctx.stroke();

  // thick rope border
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  const ropeG = linearGrad(ctx, cx - 90, cy - 90, cx + 90, cy + 90, [
    [0, '#ffe080'],
    [0.5, '#d4a010'],
    [1, '#8b6000'],
  ]);
  ctx.strokeStyle = ropeG;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = '#8b6000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // WILD text
  ctx.save();
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe060';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 14;
  ctx.fillText('WILD', cx, cy);
  ctx.fillStyle = '#fff8cc';
  ctx.shadowBlur = 0;
  ctx.fillText('WILD', cx, cy);
  ctx.restore();
}, 'wild_golden_net.png');

// ─── 10. Scatter – Lucky Lure ─────────────────────────────────────────────────
make((ctx, S) => {
  const cx = S / 2, cy = S / 2;

  // rainbow aura
  const aura = radialGrad(ctx, cx, cy, 20, 115, [
    [0, 'rgba(255,80,200,0.6)'],
    [0.4, 'rgba(80,200,255,0.35)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  // lure body
  ctx.save();
  shadow(ctx, 'rgba(0,0,0,0.4)', 12, 3, 5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 50, 28, -0.3, 0, Math.PI * 2);
  const lurG = linearGrad(ctx, cx - 50, cy - 28, cx + 50, cy + 28, [
    [0, '#ff80ff'],
    [0.3, '#ff40cc'],
    [0.6, '#cc0088'],
    [1, '#660044'],
  ]);
  ctx.fillStyle = lurG;
  ctx.fill();
  clearShadow(ctx);
  outline(ctx, '#440033', 4);
  ctx.stroke();
  ctx.restore();

  // highlight on lure
  ctx.beginPath();
  ctx.ellipse(cx - 12, cy - 8, 22, 10, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  // spinner blade
  ctx.save();
  ctx.translate(cx + 52, cy);
  ctx.rotate(0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2);
  const spG = linearGrad(ctx, -26, 0, 26, 0, [
    [0, '#ffe060'],
    [0.5, '#fff8cc'],
    [1, '#c8a000'],
  ]);
  ctx.fillStyle = spG;
  ctx.fill();
  outline(ctx, '#8b6000', 3);
  ctx.stroke();
  ctx.restore();

  // rear treble hook
  ctx.save();
  ctx.translate(cx - 52, cy + 10);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i / 3) * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(0, -14, 10, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#aabbcc';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-14, 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // eyes on lure
  ctx.beginPath();
  ctx.arc(cx + 32, cy - 5, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  outline(ctx, '#440033', 2.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 33, cy - 5, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();

  // sparkles
  const sparks = [[cx - 80, cy - 70], [cx + 85, cy - 60], [cx - 70, cy + 70], [cx + 75, cy + 65]];
  sparks.forEach(([sx, sy]) => {
    ctx.save();
    ctx.translate(sx, sy);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.rotate(Math.PI / 2);
      ctx.lineTo(0, 14);
      ctx.strokeStyle = '#ffe060';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  });

  // SCATTER badge
  ctx.save();
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe060';
  ctx.shadowColor = '#ff00aa';
  ctx.shadowBlur = 12;
  ctx.fillText('SCATTER', cx, cy + 88);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8cc';
  ctx.fillText('SCATTER', cx, cy + 88);
  ctx.restore();
}, 'scatter_lucky_lure.png');

// ─── 11. Background – Ocean ───────────────────────────────────────────────────
{
  const BG_W = 1200, BG_H = 700;
  const canvas = createCanvas(BG_W, BG_H);
  const ctx = canvas.getContext('2d');

  // deep ocean gradient
  const bg = linearGrad(ctx, 0, 0, 0, BG_H, [
    [0, '#001828'],
    [0.4, '#003055'],
    [0.75, '#004488'],
    [1, '#002244'],
  ]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BG_W, BG_H);

  // light rays from top
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 8; i++) {
    const rx = BG_W * 0.1 + i * BG_W * 0.12;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx - 120, BG_H);
    ctx.lineTo(rx + 120, BG_H);
    ctx.closePath();
    ctx.fillStyle = '#88ccff';
    ctx.fill();
  }
  ctx.restore();

  // distant coral shapes
  function coral(x, y, h, c) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = c;
    for (let b = -2; b <= 2; b++) {
      ctx.beginPath();
      ctx.moveTo(b * 18, 0);
      ctx.quadraticCurveTo(b * 22 + 10, -h * 0.5, b * 15, -h);
      ctx.quadraticCurveTo(b * 8, -h * 0.5, b * 18, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  coral(100, BG_H - 10, 120, '#cc4488');
  coral(250, BG_H - 10, 90, '#ee6644');
  coral(900, BG_H - 10, 110, '#bb3377');
  coral(1100, BG_H - 10, 100, '#dd5533');
  coral(650, BG_H - 10, 80, '#cc4488');

  // seaweed
  function seaweed(x, col) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, BG_H);
    for (let i = 0; i < 10; i++) {
      const cp = x + (i % 2 === 0 ? 25 : -25);
      ctx.quadraticCurveTo(cp, BG_H - 50 - i * 28, x, BG_H - 80 - i * 28);
    }
    ctx.stroke();
    ctx.restore();
  }
  seaweed(50, '#0a8844');
  seaweed(75, '#0a6633');
  seaweed(1130, '#0a8844');
  seaweed(1155, '#0a6633');
  seaweed(380, '#0a7738');
  seaweed(820, '#0a7738');

  // bubbles
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 60; i++) {
    const bx = Math.random() * BG_W;
    const by = Math.random() * BG_H;
    const br = 2 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // sandy floor
  const sand = linearGrad(ctx, 0, BG_H - 60, 0, BG_H, [
    [0, 'rgba(180,140,60,0)'],
    [1, 'rgba(160,120,40,0.55)'],
  ]);
  ctx.fillStyle = sand;
  ctx.fillRect(0, BG_H - 60, BG_W, 60);

  save(canvas, 'background_ocean.png');
}

// ─── 12. Slot Frame ───────────────────────────────────────────────────────────
{
  const FW = 900, FH = 480;
  const canvas = createCanvas(FW, FH);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, FW, FH);

  const pad = 22;
  const frameG = linearGrad(ctx, 0, 0, 0, FH, [
    [0, '#f0d060'],
    [0.25, '#d4a010'],
    [0.5, '#ffe080'],
    [0.75, '#c88000'],
    [1, '#8b5e00'],
  ]);

  // outer frame rect
  ctx.beginPath();
  ctx.roundRect(0, 0, FW, FH, 24);
  ctx.fillStyle = frameG;
  ctx.fill();

  // cut out interior
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.roundRect(pad, pad, FW - pad * 2, FH - pad * 2, 14);
  ctx.fill();
  ctx.restore();

  // inner emboss ring
  ctx.beginPath();
  ctx.roundRect(pad * 0.5, pad * 0.5, FW - pad, FH - pad, 18);
  ctx.strokeStyle = 'rgba(255,240,100,0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();

  save(canvas, 'slot_frame.png');
}

console.log('\nAll assets generated successfully!');
