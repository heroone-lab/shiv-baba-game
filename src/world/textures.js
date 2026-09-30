import * as THREE from 'three';

// Canvas-generated textures for signage (all branding says SHIV BABA).
export function logoTexture({ w = 2048, h = 512, bg = null, sub = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, bg[0]); grd.addColorStop(1, bg[1]);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = h * 0.03;
    g.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08);
  }
  const size = sub ? h * 0.52 : h * 0.66;
  g.font = `900 italic ${size}px "Arial Black", "Segoe UI", Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const y = sub ? h * 0.42 : h * 0.52;
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16; g.strokeStyle = '#3a1300'; g.strokeText('SHIV BABA', w / 2, y);
  const tg = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  tg.addColorStop(0, '#fff3a0'); tg.addColorStop(0.45, '#ffc21a'); tg.addColorStop(1, '#ff6a00');
  g.fillStyle = tg; g.fillText('SHIV BABA', w / 2, y);
  if (sub) {
    g.font = `800 ${h * 0.17}px "Arial Black", "Segoe UI", sans-serif`;
    g.fillStyle = '#ffffff'; g.fillText(sub, w / 2, h * 0.8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function flagTexture(color, stripe) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 160);
  g.fillStyle = stripe; g.fillRect(0, 60, 256, 40);
  g.font = '900 italic 34px "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.fillText('SHIV BABA', 128, 81);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function softDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 30, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.85, 'rgba(255,255,255,0.4)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- pirate set (Episode 2)
function skullPath(g, cx, cy, s, fill = '#f4f1e8') {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.fillStyle = fill;
  // crossbones
  for (const a of [0.7, -0.7]) {
    g.save(); g.rotate(a);
    g.fillRect(-46, -5, 92, 10);
    for (const x of [-46, 46]) for (const y of [-6, 6]) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // skull
  g.beginPath(); g.ellipse(0, -8, 28, 26, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(-16, 8, 32, 16);
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(-10, -8, 7, 8, 0, 0, Math.PI * 2); g.ellipse(10, -8, 7, 8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, 7); g.lineTo(4, 7); g.fill();
  for (const x of [-9, -3, 3, 9]) g.fillRect(x - 1, 14, 2, 10);
  g.restore();
}

export function skullTexture(bg = '#1d1d20', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  // worn edges
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = size * 0.04; g.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * size, Math.random() * size, 6, 2); }
  skullPath(g, size / 2, size / 2 + 4, size / 190);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function pirateFlagTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#141416'; g.fillRect(0, 0, 256, 160);
  skullPath(g, 128, 78, 1.05);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** transparent chevrons (slide / downhill sections), repeats along the deck */
export function chevronTexture(color = 'rgba(245,236,214,0.92)') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(40, 0); g.lineTo(150, 128); g.lineTo(40, 256); g.lineTo(100, 256); g.lineTo(210, 128); g.lineTo(100, 0);
  g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** red speed-boost arrows */
export function boostTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0, '#5a0c06'); grd.addColorStop(1, '#8a1408');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 150;
    g.fillStyle = i === 2 ? '#ffd84a' : '#ff5a2a';
    g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 90, 128); g.lineTo(x, 226); g.lineTo(x + 40, 226); g.lineTo(x + 130, 128); g.lineTo(x + 40, 30); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function coinTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(54, 50, 6, 64, 64, 64);
  grd.addColorStop(0, '#fff6b0'); grd.addColorStop(0.6, '#ffc21a'); grd.addColorStop(1, '#b8740a');
  g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#9a5c06'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  g.font = '900 italic 50px "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#8a4a00'; g.fillText('SB', 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
