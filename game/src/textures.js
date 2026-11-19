// Procedural canvas textures: facades, asphalt, sidewalks, grass, sand,
import * as THREE from '../vendor/three.module.min.js';
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function lcg(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
function speckle(g, w, h, n, colors, size) {
  for (let i = 0; i < n; i += 1) {
    g.fillStyle = colors[i % colors.length];
    g.globalAlpha = 0.25 + (i % 5) * 0.12;
    const s = 1 + (i % size);
    g.fillRect((i * 37) % w, (i * 91) % h, s, s);
  }
  g.globalAlpha = 1;
}
function toTexture(c, repeat) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}
// per floor); near-white base so the wall color tints it.
export function makeFacadeTexture(random, litRatio) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e9e4d6';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 180, ['#ddd5c2', '#f2eee2', '#d5cdb8'], 2);
  // Floor bands and a darker ground-floor strip.
  g.fillStyle = 'rgba(120, 105, 80, 0.35)';
  g.fillRect(0, 124, 256, 6);
  g.fillRect(0, 252, 256, 4);
  g.fillStyle = 'rgba(90, 75, 55, 0.28)';
  g.fillRect(0, 216, 256, 40);
  // Windows: 2 per floor.
  for (let floor = 0; floor < 2; floor += 1) {
    for (let col = 0; col < 2; col += 1) {
      const wx = 32 + col * 124;
      const wy = 24 + floor * 128;
      g.fillStyle = '#f5f2e8';
      g.fillRect(wx - 4, wy - 4, 60, 76);
      const grad = g.createLinearGradient(wx, wy, wx, wy + 68);
      const lit = random() < litRatio;
      if (lit) {
        grad.addColorStop(0, '#ffe9a8');
        grad.addColorStop(1, '#f2b95a');
      } else {
        grad.addColorStop(0, '#3a5470');
        grad.addColorStop(1, '#1e2c3c');
      }
      g.fillStyle = grad;
      g.fillRect(wx, wy, 52, 68);
      g.fillStyle = 'rgba(245, 242, 232, 0.9)';
      g.fillRect(wx + 24, wy, 4, 68);
      g.fillRect(wx, wy + 32, 52, 4);
      if (random() < 0.3) {
        g.fillStyle = '#8a8a82';
        g.fillRect(wx + 8, wy + 76, 36, 16);
      }
    }
  }
  const grime = g.createLinearGradient(0, 0, 0, 256);
  grime.addColorStop(0, 'rgba(60, 45, 30, 0)');
  grime.addColorStop(1, 'rgba(60, 45, 30, 0.14)');
  g.fillStyle = grime;
  g.fillRect(0, 0, 256, 256);
  return toTexture(c);
}
export function makeAsphaltTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#46494f';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 840, ['#55585e', '#34373c', '#4e5158', '#3e4146'], 2);
  g.strokeStyle = 'rgba(20, 20, 22, 0.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(20, 0);
  g.lineTo(60, 256);
  g.moveTo(180, 0);
  g.lineTo(140, 256);
  g.stroke();
  g.strokeStyle = 'rgba(18, 18, 20, 0.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(40, 80);
  g.lineTo(90, 120);
  g.lineTo(80, 180);
  g.stroke();
  return toTexture(c);
}
// Pale concrete with a 4x4 tile grid and speckle.
export function makeSidewalkTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#a8a49b';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 520, ['#b8b4ab', '#98948b', '#a29e95'], 2);
  g.strokeStyle = 'rgba(110, 105, 95, 0.7)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  return toTexture(c);
}
// Grass: green base with soft patches and lighter blades.
export function makeGrassTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#458a38';
  g.fillRect(0, 0, 256, 256);
  const rnd = lcg(777);
  for (let i = 0; i < 14; i += 1) {
    const px = rnd() * 256;
    const py = rnd() * 256;
    const pr = 16 + rnd() * 36;
    const grad = g.createRadialGradient(px, py, 0, px, py, pr);
    grad.addColorStop(0, 'rgba(38, 104, 30, 0.35)');
    grad.addColorStop(1, 'rgba(38, 104, 30, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(px, py, pr, 0, Math.PI * 2);
    g.fill();
  }
  speckle(g, 256, 256, 600, ['#3f7a32', '#5fa84e', '#478a38'], 2);
  g.strokeStyle = 'rgba(120, 190, 90, 0.7)';
  g.lineWidth = 1;
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 8); g.stroke();
  }
  return toTexture(c);
}
// Warm sand with speckle.
export function makeSandTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e8d29a';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 640, ['#dcc27e', '#f2e2b2', '#d4b878'], 2);
  return toTexture(c);
}
// Water: deep blue with lighter wave strokes and sparkle.
export function makeWaterTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#2a7fa8';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(120, 190, 220, 0.55)';
  g.lineWidth = 2;
  for (let row = 0; row < 6; row += 1) {
    const y = 24 + row * 40;
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const yy = y + Math.sin((x + row * 40) * 0.12) * 3;
      if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
  }
  speckle(g, 256, 256, 120, ['#bfe0ee', '#7ab8d4'], 1);
  return toTexture(c);
}
export function makeSkyTexture(night) {
  const [c, g] = canvas(1024, 512);
  if (night) {
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#030612');
    grad.addColorStop(0.45, '#0a1830');
    grad.addColorStop(0.7, '#1a2a4a');
    grad.addColorStop(1, '#2a2a3a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
    const rnd = lcg(4242);
    for (let i = 0; i < 260; i += 1) {
      const sx = rnd() * 1024;
      const sy = rnd() * 300;
      const a = 0.3 + rnd() * 0.7;
      const r = rnd() < 0.08 ? 2.4 : 1.2;
      g.fillStyle = `rgba(255, 255, 255, ${a})`;
      g.fillRect(sx, sy, r, r);
    }
    const moon = g.createRadialGradient(820, 90, 4, 820, 90, 60);
    moon.addColorStop(0, 'rgba(240, 244, 255, 0.95)');
    moon.addColorStop(0.25, 'rgba(220, 228, 255, 0.55)');
    moon.addColorStop(1, 'rgba(220, 228, 255, 0)');
    g.fillStyle = moon;
    g.fillRect(740, 10, 160, 160);
    g.fillStyle = '#f0f4ff';
    g.beginPath();
    g.arc(820, 90, 22, 0, Math.PI * 2);
    g.fill();
    const tex = toTexture(c);
    tex.flipY = false;
    return tex;
  }
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#3f7fc8');
  grad.addColorStop(0.42, '#7fb0dd');
  grad.addColorStop(0.6, '#ffd9a0');
  grad.addColorStop(0.78, '#f2a860');
  grad.addColorStop(1, '#e88a50');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  const rnd = lcg(1337);
  for (let i = 0; i < 150; i += 1) {
    const cx = rnd() * 1024;
    const cy = 16 + rnd() * rnd() * 240;
    const rx = 40 + rnd() * 104;
    const ry = 8 + rnd() * 18;
    const a = 0.16 + rnd() * 0.3;
    const blob = g.createRadialGradient(cx, cy, 1, cx, cy, rx);
    blob.addColorStop(0, `rgba(255, 250, 244, ${a})`);
    blob.addColorStop(1, 'rgba(255, 250, 244, 0)');
    g.fillStyle = blob;
    g.save();
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    g.translate(-cx, -cy);
    g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
    g.restore();
  }
  const tex = toTexture(c);
  tex.flipY = false;
  return tex;
}
export function makeBrickTexture(random) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#6a5a4a';
  g.fillRect(0, 0, 256, 256);
  const tones = ['#9a5a44', '#a86a4a', '#8a4a3a', '#b07a52', '#96604a'];
  const bh = 32;
  const bw = 64;
  for (let row = 0; row < 256 / bh; row += 1) {
    const off = (row % 2) * (bw / 2);
    for (let col = -1; col < 256 / bw + 1; col += 1) {
      g.fillStyle = tones[Math.floor(random() * tones.length)];
      g.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
      g.fillStyle = 'rgba(255, 220, 180, 0.08)';
      g.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, 3);
    }
  }
  speckle(g, 256, 256, 240, ['#5a4a3c', '#7a6a58'], 2);
  return toTexture(c);
}
// emissiveMap, so the text glows through the bloom pass).
export function makeNeonSignTexture(text, color) {
  const [c, g] = canvas(512, 192);
  g.fillStyle = '#0c0e12';
  g.fillRect(0, 0, 512, 192);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(10, 10, 492, 172);
  g.font = 'bold 80px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 32;
  g.fillStyle = color;
  g.fillText(text, 256, 100, 472);
  g.shadowBlur = 0;
  return toTexture(c);
}
// emissiveMap, so a few windows glow at golden hour).
export function makeSkylineTexture(random, litRatio) {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#232a36';
  g.fillRect(0, 0, 256, 512);
  for (let y = 16; y < 496; y += 32) {
    for (let x = 16; x < 240; x += 32) {
      const lit = random() < litRatio;
      g.fillStyle = lit ? (random() < 0.6 ? '#ffd98a' : '#bfe0f2') : '#12161e';
      g.fillRect(x, y, 18, 22);
    }
  }
  return toTexture(c);
}
// Striped awning: alternating bands, used on storefronts.
// Soft radial glow for the sun sprite.
export function makeGlowTexture() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 240, 200, 1)');
  grad.addColorStop(0.35, 'rgba(255, 210, 140, 0.55)');
  grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
// A simple painted sign: big bold text on a colored board.
