// Builds one long episode course out of consecutive sections.
// Each section is written in its own local coordinates (its first deck starts at x = 0)
// and is shifted along +X after the previous one, so every episode is a single
// continuous run: start tower -> section 1 -> section 2 -> ... -> finish pad.
//
// section(T) returns:
//   { len, platforms, coins?, boosts?, checkpoints?, obstacles(mats, at), decor?(mats, at) }
// where `at(x)` converts a local x into the course x. Obstacle ids get a section
// prefix ("2.O5") so they stay unique across the whole episode.

export const GAP = 2.2; // water gap between two sections (always one easy jump)

export function tower(T) {
  return [
    { x0: -11.5, x1: -8, t0: T + 3.4, kind: 'tower' },
    { x0: -8, x1: 0, t0: T + 3.4, t1: T, kind: 'ramp' }, // slide down it for speed
  ];
}
export const onRamp = (T, x) => T + 3.4 * (-x / 8);

/** stepping blocks 2.4 m long; `pitch` = start-to-start distance (a full-speed jump is ~5.3 m) */
export const blocks = (x0, tops, pitch = 5.0, extra = {}) =>
  tops.map((t0, i) => ({ x0: x0 + i * pitch, x1: x0 + i * pitch + 2.4, t0, kind: 'block', ...extra }));

/** a row of big bobbing balls on poles, 5.3 m apart (one full jump each) */
export const balls = (x0, n, top, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ x0: x0 + i * 5.3, x1: x0 + i * 5.3 + 2.7, t0: top, kind: 'ball', bob: 0.16, bobPhase: i * 1.6, ...extra }));

export function composeEpisode(meta, sectionFns) {
  const T = meta.top;
  const platforms = [...tower(T)];
  const coins = [{ x: -4, y: onRamp(T, -4) + 0.8 }];
  const boosts = [], checkpoints = [], obsFns = [], decorFns = [];
  let ox = 0;
  sectionFns.forEach((fn, k) => {
    const s = fn(T);
    const base = ox;
    const at = (x) => x + base; // captured now: obstacles are built later
    for (const p of s.platforms) platforms.push({ ...p, x0: at(p.x0), x1: at(p.x1) });
    for (const c of s.coins || []) coins.push({ ...c, x: at(c.x) });
    for (const b of s.boosts || []) boosts.push({ x0: at(b.x0), x1: at(b.x1) });
    for (const c of s.checkpoints || []) checkpoints.push(at(c));
    const prefix = `${k + 1}.`;
    obsFns.push((m) => s.obstacles(m, at).map((o) => { o.id = prefix + o.id; return o; }));
    if (s.decor) decorFns.push((m) => s.decor(m, at));
    const last = s.platforms[s.platforms.length - 1];
    ox += (s.len ?? last.x1) + GAP;
  });
  // finish pad after the last section
  const lastTop = platforms[platforms.length - 1].t1 ?? platforms[platforms.length - 1].t0;
  const fx0 = ox - GAP + 1.8;
  platforms.push({ x0: fx0, x1: fx0 + 4.6, t0: Math.max(lastTop, T) + 0.9, kind: 'nest' });
  return {
    ...meta,
    countdown: true,
    platforms,
    finishX: fx0 + 0.9,
    coins, boosts, checkpoints,
    obstacles: (m) => obsFns.flatMap((f) => f(m)),
    decor: (m) => decorFns.flatMap((f) => f(m)),
    sectionCount: sectionFns.length,
  };
}
