import { IS_TOUCH } from './quality.js';

// Player-selectable display settings, persisted in localStorage.
//   resolution: internal render height (short side of the screen) — 480 / 720 / 1080
//   fps:        frame-rate cap — 30 / 48 / 60
//   showFps:    on-screen FPS meter
export const RESOLUTIONS = [480, 720, 1080];
export const FPS_OPTIONS = [30, 48, 60];

// Per-resolution rendering budget. Lower resolutions also get cheaper
// shadows, reflections and post effects so they run well on weak phones.
export const RES_PRESETS = {
  480: { shadowMap: 1024, waterRes: 256, bloom: false, msaa: 0, smaa: true },
  720: { shadowMap: 1024, waterRes: 512, bloom: true, msaa: 0, smaa: true },
  1080: { shadowMap: 2048, waterRes: 1024, bloom: true, msaa: 4, smaa: false },
};

const KEY = 'sb_display';

export function loadSettings() {
  const def = IS_TOUCH ? { resolution: 720, fps: 30, showFps: false } : { resolution: 1080, fps: 60, showFps: false };
  try {
    const s = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!RESOLUTIONS.includes(s.resolution)) s.resolution = def.resolution;
    if (!FPS_OPTIONS.includes(s.fps)) s.fps = def.fps;
    const q = new URLSearchParams(location.search);
    if (q.has('res') && RESOLUTIONS.includes(+q.get('res'))) s.resolution = +q.get('res');
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
