import * as THREE from 'three';

// Procedural canvas textures for the Episode 3-6 themes (no downloads needed).
// A seeded RNG keeps them identical on every load.

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

/** Episode 3: riveted grey steel plates (deck tops and sides). */
export function steelPlateTexture() {
  const [c, g] = canvas(512);
  const r = rng(31);
  g.fillStyle = '#8d9196'; g.fillRect(0, 0, 512, 512);
  const n = 2, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * s, y = j * s;
    const grd = g.createLinearGradient(x, y, x + s, y + s);
    const base = 128 + r() * 22;
    grd.addColorStop(0, `rgb(${base + 18},${base + 20},${base + 24})`);
    grd.addColorStop(1, `rgb(${base - 14},${base - 12},${base - 8})`);
    g.fillStyle = grd; g.fillRect(x + 3, y + 3, s - 6, s - 6);
    // brushed streaks + scuffs
    for (let k = 0; k < 160; k++) {
      g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${0.03 + r() * 0.04})`;
      g.fillRect(x + r() * s, y + r() * s, 10 + r() * 60, 1 + r() * 1.5);
    }
    // seams and rivets
    g.strokeStyle = 'rgba(30,32,36,0.9)'; g.lineWidth = 5; g.strokeRect(x + 2, y + 2, s - 4, s - 4);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(x + 7, y + 7, s - 14, s - 14);
    for (const [u, v] of [[14, 14], [s - 14, 14], [14, s - 14], [s - 14, s - 14], [s / 2, 14], [s / 2, s - 14]]) {
      const rg = g.createRadialGradient(x + u - 2, y + v - 2, 1, x + u, y + v, 7);
      rg.addColorStop(0, '#e6e8ea'); rg.addColorStop(1, '#3b3e43');
      g.fillStyle = rg; g.beginPath(); g.arc(x + u, y + v, 6, 0, Math.PI * 2); g.fill();
    }
  }
  return tex(c);
}

/** Episode 4: golden sponge cake with pores and a toasted crust tint. */
export function spongeTexture() {
  const [c, g] = canvas(512);
  const r = rng(47);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#e9b646'); grd.addColorStop(1, '#d59a2c');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) {
    const x = r() * 512, y = r() * 512, rad = 0.8 + r() * r() * 5;
    g.fillStyle = `rgba(${120 + r() * 40},${70 + r() * 30},10,${0.18 + r() * 0.3})`;
    g.beginPath(); g.ellipse(x, y, rad * 1.3, rad, r() * 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,236,170,${0.15 + r() * 0.2})`;
    g.beginPath(); g.arc(x - rad * 0.4, y - rad * 0.4, rad * 0.5, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

/** Cheese block: pale yellow with round holes. */
export function cheeseTexture() {
  const [c, g] = canvas(512);
  const r = rng(53);
  g.fillStyle = '#f2cf57'; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 40; k++) {
    const x = r() * 512, y = r() * 512, rad = 8 + r() * 28;
    const rg = g.createRadialGradient(x + rad * 0.3, y + rad * 0.3, rad * 0.1, x, y, rad);
    rg.addColorStop(0, '#b88a1c'); rg.addColorStop(0.8, '#d9ad35'); rg.addColorStop(1, '#f6dc79');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

/** Chocolate-chip cookie top. */
export function cookieTexture() {
  const [c, g] = canvas(512);
  const r = rng(61);
  const grd = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  grd.addColorStop(0, '#d9a25a'); grd.addColorStop(1, '#a8702e');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(90,50,10,${r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 3, 3); }
  for (let k = 0; k < 34; k++) {
    const x = 40 + r() * 432, y = 40 + r() * 432;
    g.fillStyle = '#3a1d0c'; g.beginPath(); g.ellipse(x, y, 10 + r() * 10, 8 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,220,180,0.25)'; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, Math.PI * 2); g.fill();
  }
  return tex(c, { repeat: false });
}

/** Horizontal rainbow bands (ramps, poles, arches). */
export function rainbowTexture(vertical = false) {
  const [c, g] = canvas(256);
  const cols = ['#e8322c', '#f7902a', '#f7d52a', '#4cc24a', '#2a8fe8', '#8a4ce8'];
  cols.forEach((col, i) => {
    g.fillStyle = col;
    if (vertical) g.fillRect(0, (i * 256) / cols.length, 256, 256 / cols.length + 1);
    else g.fillRect((i * 256) / cols.length, 0, 256 / cols.length + 1, 256);
  });
  g.fillStyle = 'rgba(255,255,255,0.18)';
  if (vertical) for (let i = 0; i < 6; i++) g.fillRect(0, i * 42.6 + 4, 256, 6);
  return tex(c);
}

/** Diagonal stripes (candy canes, barber poles, hazard bars). */
export function stripeTexture(a = '#e8322c', b = '#ffffff', n = 4) {
  const [c, g] = canvas(256);
  g.fillStyle = b; g.fillRect(0, 0, 256, 256);
  g.fillStyle = a;
  const w = 256 / n;
  for (let i = -n; i < n * 2; i++) {
    g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w + w / 2, 0); g.lineTo(i * w + w / 2 + 256, 256); g.lineTo(i * w + 256, 256); g.closePath(); g.fill();
  }
  return tex(c);
}

/** Peppermint swirl for candy balls. */
export function peppermintTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#fff6f8'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#e8326e' : '#ff8fb4';
    g.beginPath();
    const x = i * 64;
    g.moveTo(x, 0); g.lineTo(x + 30, 0); g.bezierCurveTo(x + 60, 90, x - 20, 170, x + 30, 256); g.lineTo(x, 256); g.bezierCurveTo(x - 50, 170, x + 30, 90, x, 0);
    g.fill();
  }
  return tex(c);
}

/** Red cap with white spots (mushroom balls). */
export function mushroomTexture() {
  const [c, g] = canvas(512, 256);
  const r = rng(71);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#e2432c'); grd.addColorStop(0.7, '#b8261a'); grd.addColorStop(1, '#7a140c');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 46; k++) {
    const x = r() * 512, y = 10 + r() * 170, rad = 7 + r() * 13;
    g.fillStyle = '#fff8ee'; g.beginPath(); g.ellipse(x, y, rad * 1.4, rad, 0, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

/** Speckled brown stone (Episode 3 big balls). */
export function stoneTexture() {
  const [c, g] = canvas(512, 256);
  const r = rng(83);
  g.fillStyle = '#b28a5c'; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 3000; k++) {
    g.fillStyle = `rgba(${60 + r() * 60},${40 + r() * 40},${20 + r() * 30},${r() * 0.35})`;
    const s = 1 + r() * r() * 14;
    g.beginPath(); g.arc(r() * 512, r() * 256, s, 0, Math.PI * 2); g.fill();
  }
  for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,240,210,${r() * 0.25})`; g.fillRect(r() * 512, r() * 256, 2, 2); }
  return tex(c);
}

/** Episode 6: dark carbon deck with a glowing grid (map + emissive map). */
export function neonDeckTextures(color = '#28e8ff') {
  const [c, g] = canvas(512);
  const r = rng(97);
  g.fillStyle = '#12151c'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < 512; x += 16) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(x, y, 8, 8); }
  for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 20 + r() * 40, 1); }
  const [e, eg] = canvas(512);
  eg.fillStyle = '#000'; eg.fillRect(0, 0, 512, 512);
  for (const ctx of [g, eg]) {
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 500);
    ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(256, 6); ctx.lineTo(256, 506); ctx.moveTo(6, 256); ctx.lineTo(506, 256); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  return { map: tex(c), emissive: tex(e) };
}

/** Night sky: deep gradient, stars, a big moon and a faint city glow on the horizon. */
export function nightSkyTexture() {
  const W = 2048, H = 1024;
  const [c, g] = canvas(W, H);
  const r = rng(113);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#02030a'); grd.addColorStop(0.35, '#060d24'); grd.addColorStop(0.49, '#16264e');
  grd.addColorStop(0.5, '#2a2440'); grd.addColorStop(0.56, '#0a0d18'); grd.addColorStop(1, '#040508');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 2600; k++) {
    const y = r() * H * 0.48, x = r() * W;
    const b = r();
    g.fillStyle = `rgba(${200 + b * 55},${210 + b * 45},255,${0.25 + b * 0.75})`;
    const s = b > 0.97 ? 2.4 : b > 0.85 ? 1.6 : 1;
    g.fillRect(x, y, s, s);
  }
  // milky way band
  for (let k = 0; k < 900; k++) {
    const u = r();
    const x = u * W, y = H * (0.08 + 0.25 * Math.sin(u * Math.PI)) + (r() - 0.5) * 70;
    g.fillStyle = `rgba(150,160,255,${r() * 0.06})`;
    g.beginPath(); g.arc(x, y, 6 + r() * 26, 0, Math.PI * 2); g.fill();
  }
  // moon (placed so it sits behind the course from the side camera: -Z direction)
  const mx = W * 0.75, my = H * 0.24, mr = 46;
  const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 5);
  halo.addColorStop(0, 'rgba(200,215,255,0.35)'); halo.addColorStop(1, 'rgba(200,215,255,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(mx, my, mr * 5, 0, Math.PI * 2); g.fill();
  const moon = g.createRadialGradient(mx - 12, my - 12, 8, mx, my, mr);
  moon.addColorStop(0, '#ffffff'); moon.addColorStop(1, '#c9d2e6');
  g.fillStyle = moon; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(120,130,160,0.25)'; g.beginPath(); g.arc(mx + (r() - 0.5) * mr * 1.4, my + (r() - 0.5) * mr * 1.4, 3 + r() * 8, 0, Math.PI * 2); g.fill(); }
  // distant city lights along the horizon
  for (let k = 0; k < 1400; k++) {
    const x = r() * W, y = H * 0.5 + r() * r() * 22;
    g.fillStyle = r() > 0.5 ? `rgba(255,${180 + r() * 60},120,${0.4 + r() * 0.5})` : `rgba(140,200,255,${0.3 + r() * 0.4})`;
    g.fillRect(x, y, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/** Soft round glow sprite (lamps, floodlights, fireworks). */
export function glowTexture() {
  const [c, g] = canvas(128);
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  return tex(c, { repeat: false });
}

/** Flag cloth for each theme (drawn on the waving flags behind the pool). */
export function themeFlagTexture(theme, i) {
  const [c, g] = canvas(256, 160);
  if (theme === 'steel') {
    g.fillStyle = i % 2 ? '#3a4048' : '#9aa3ad'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#f07a12'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(k * 50 - 20, 160); g.lineTo(k * 50 + 5, 160); g.lineTo(k * 50 + 45, 0); g.lineTo(k * 50 + 20, 0); g.fill(); }
  } else if (theme === 'food') {
    g.fillStyle = ['#e8322c', '#f7d52a', '#4cc24a', '#ffffff'][i % 4]; g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 8; k++) g.fillRect(k * 32, 0, 16, 160);
  } else if (theme === 'candy') {
    const cols = ['#ff6ab0', '#ffffff', '#8ad8ff', '#ffe066'];
    g.fillStyle = cols[i % 4]; g.fillRect(0, 0, 256, 160);
    g.fillStyle = cols[(i + 1) % 4]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(30 + k * 50, 80, 16, 0, Math.PI * 2); g.fill(); }
  } else {
    g.fillStyle = '#07080f'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = ['#28e8ff', '#ff3cc8', '#ffd84a', '#7dff8a'][i % 4]; g.lineWidth = 10; g.strokeRect(12, 12, 232, 136);
    g.font = '900 italic 56px "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = g.strokeStyle; g.fillText('SB', 128, 84);
  }
  return tex(c, { repeat: false });
}
