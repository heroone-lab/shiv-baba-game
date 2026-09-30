import { IS_TOUCH } from './quality.js';

// Player-selectable display settings, persisted in localStorage.
//   resolution: internal render height (short side of the screen) — 480 / 720 / 1080
//   fps:        frame-rate cap — 30 / 48 / 60
//   showFps:    on-screen FPS meter
export const RESOLUTIONS = ['auto', 480, 720, 1080];
export const FPS_OPTIONS = [30, 48, 60];

// Per-resolution rendering budget. Lower resolutions also get cheaper
// shadows, reflections and post effects so they run well on weak phones.
// fancy = clearcoat/sheen on the vinyl pads; shadowEvery = re-render the shadow map every N frames
// post = full-screen effects (bloom, grading, SMAA); off = tone mapping only, done in the main pass
// cheapWater = fewer texture samples in the pool shader
export const RES_PRESETS = {
  480: { shadowMap: 1024, waterRes: 256, post: false, bloom: false, msaa: 0, fancy: false, cheapWater: true, shadowEvery: 2 },
  720: { shadowMap: 1024, waterRes: 512, post: true, bloom: true, msaa: 0, fancy: false, cheapWater: false, shadowEvery: 1 },
  1080: { shadowMap: 2048, waterRes: 1024, post: true, bloom: true, msaa: 0, fancy: true, cheapWater: false, shadowEvery: 1 },
  auto: { shadowMap: 1024, waterRes: 512, post: true, bloom: true, msaa: 0, fancy: false, cheapWater: false, shadowEvery: 1 },
};
export const AUTO_MIN = 360, AUTO_MAX = 1080;

const KEY = 'sb_display';

export function loadSettings() {
  const def = IS_TOUCH ? { resolution: 'auto', fps: 30, showFps: false } : { resolution: 'auto', fps: 60, showFps: false };
  try {
    const s = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!RESOLUTIONS.includes(s.resolution)) s.resolution = def.resolution;
    if (!FPS_OPTIONS.includes(s.fps)) s.fps = def.fps;
    const q = new URLSearchParams(location.search);
    if (q.has('res')) { const r = q.get('res') === 'auto' ? 'auto' : +q.get('res'); if (RESOLUTIONS.includes(r)) s.resolution = r; }
    if (q.has('fps') && FPS_OPTIONS.includes(+q.get('fps'))) s.fps = +q.get('fps');
    return s;
  } catch {
    return def;
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify({ resolution: s.resolution, fps: s.fps, showFps: s.showFps }));
}

/**
 * Pixel ratio that makes the short side of the canvas render at `target` pixels.
 * Never exceeds the screen's native pixels (nothing to gain) and never goes below 0.5.
 */
export function pixelRatioFor(target, cssW = innerWidth, cssH = innerHeight) {
  if (target === 'auto') target = 720;
  const short = Math.max(1, Math.min(cssW, cssH));
  const native = short * (window.devicePixelRatio || 1);
  const px = Math.min(target, native);
  return { pixelRatio: Math.max(0.5, px / short), renderShort: Math.round(px), nativeShort: Math.round(native) };
}

/**
 * Frame limiter. Call `shouldRender(now)` from requestAnimationFrame; it returns
 * true on the frames that should be drawn to hit the target rate. Uses a
 * drifting schedule so 48 fps on a 60 Hz screen averages exactly 48.
 */
export class FrameLimiter {
  constructor(fps) { this.set(fps); this.next = 0; }
  set(fps) { this.fps = fps; this.interval = 1000 / fps; this.next = 0; }
  shouldRender(now) {
    if (this.fps >= 240) return true;
    if (!this.next) { this.next = now + this.interval; return true; }
    // 1.5 ms tolerance absorbs rAF timestamp jitter so 60 on a 60 Hz screen never drops frames
    if (now < this.next - 1.5) return false;
    this.next += this.interval;
    if (now - this.next > this.interval * 2) this.next = now + this.interval; // fell far behind (tab was hidden)
    return true;
  }
}

/** Rolling FPS measurement over the last second of rendered frames. */
export class FpsMeter {
  constructor() { this.times = []; this.fps = 0; this.worst = 0; }
  tick(now) {
    const t = this.times;
    t.push(now);
    while (t.length && now - t[0] > 1000) t.shift();
    if (t.length > 1) {
      this.fps = ((t.length - 1) * 1000) / (t[t.length - 1] - t[0]);
      let worst = 0;
      for (let i = 1; i < t.length; i++) worst = Math.max(worst, t[i] - t[i - 1]);
      this.worst = worst;
    }
    return this.fps;
  }
}

/**
 * Dynamic resolution: lowers the render height when the device misses the FPS
 * target and carefully raises it again when there is headroom.
 */
export class AutoResolution {
  constructor(start = 720) { this.reset(start); }
  reset(h = 720) { this.height = h; this.acc = 0; this.good = 0; this.cooldown = 0; this.lastUp = null; this.ceil = Infinity; this.ceilT = 0; }
  /** call once per rendered frame; returns true when the height changed */
  update(dt, fps, target, maxHeight) {
    this.acc += dt;
    this.cooldown -= dt;
    this.ceilT -= dt;
    if (this.ceilT <= 0) this.ceil = Infinity;
    if (this.acc < 0.5) return false;
    this.acc = 0;
    const ratio = fps / target;
    const prev = this.height;
    if (ratio < 0.93) {
      // too slow: drop quickly (bigger step the further we are from target)
      const f = ratio < 0.6 ? 0.75 : 0.88;
      // the last raise was too much: remember that height as a ceiling for a while
      if (this.lastUp) { this.ceil = this.height; this.ceilT = 30; this.cooldown = 4; }
      this.height = Math.max(AUTO_MIN, Math.round(this.height * f));
      this.good = 0; this.lastUp = null;
    } else if (ratio > 0.97) {
      this.good += 0.5;
      const cap = Math.min(AUTO_MAX, maxHeight, this.ceil - 1);
      if (this.good >= 2 && this.cooldown <= 0 && this.height < cap) {
        this.lastUp = { from: this.height };
        this.height = Math.min(cap, Math.round(this.height * 1.08));
        this.good = 0; this.cooldown = 1.5;
      }
    } else this.good = 0;
    return this.height !== prev;
  }
}

/** Name of the GPU the browser is using, and whether it is a software renderer. */
export function gpuInfo(gl) {
  let name = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch { /* ignore */ }
  const software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(name);
  const short = String(name).replace(/^ANGLE \(/, '').replace(/\)$/, '').replace(/Direct3D.*$/i, '').replace(/,\s*$/, '').trim();
  return { name, short, software };
}
