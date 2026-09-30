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
