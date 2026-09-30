import { DECK_TOP } from '../../config.js';
import { PaddleLog, VerticalBlocker, SwingingBall, GapSpinner, SwingGate, SlideBeam } from '../obstacles.js';
import { Sweeper, Rotor, Pendulum, IronRoller, Stamper, WheelSpinner, SideCannon, BladePendulum, SkullCrate, VerticalWheel } from '../pirate.js';
import { SpinBar, Pusher, Press, LaneSwing, CrossSwing, Windmill, Roller } from '../generic.js';
import { LaserGate, LaserGrid, LaserSpinner, FlameJets, TeslaGate, Meteor, Drone, Bollards, SawTrack, WindFan, Trampoline, FireHoop } from '../night.js';
import { composeEpisode, blocks, balls } from './compose.js';

// Episode 6: GRAND FINALE. Night, neon, the whole course on pylons high above the pool.
// 50 obstacles, every one different (name, look or timing): the best of Episodes 1-5
// in neon, plus lasers, flames, tesla arcs, meteors, drones, saws, wind and fire hoops.
// Between the 5 zones: stepping blocks, hydraulic lifts, vanishing glass and glowing orbs.

const HIGH = 6.6; // metres above the normal deck height

/**
 * Lay out a zone from a list of slots. A slot is one deck with its obstacle(s):
 *   { n: 'Name', o: (m, x, T) => obstacle | [obstacles], len = 12, at = 6.5, chev, boost }
 *   { n, gap: 3.4, o }            obstacle sitting in a water gap after the deck
 *   { n, tramp: true }            trampoline in a gap up to a raised deck
 *   { plat: (x0, T) => ({ platforms, end, coins }) }   a platform-only challenge
 * Obstacles are built directly at their final course x (compose passes `at`).
 */
function zoneAt(slots) {
  return (T) => {
    const platforms = [], coins = [], boosts = [];
    let x = 0;
    for (const s of slots) {
      if (s.plat) {
        const r = s.plat(x, T);
        platforms.push(...r.platforms); coins.push(...(r.coins || []));
        x = r.end + 2.2;
        continue;
      }
      const len = s.len ?? 12;
      platforms.push({ x0: x, x1: x + len, t0: T, chev: s.chev });
      if (s.boost) boosts.push({ x0: x + 0.4, x1: x + 2.2 });
      coins.push({ x: x + 2.6, h: 0.9 });
      if (s.tramp) {
        const tx = x + len + 5.6;
        platforms.push({ x0: tx + 3.0, x1: tx + 11, t0: T + 1.8 });
        coins.push({ x: tx, y: T + 1.2 });
        x = tx + 11 + 2.2;
        continue;
      }
      x += len + (s.gap ?? 2.2);
    }
    return {
      platforms, coins, boosts,
      obstacles: (m, at) => { let k = 0; return slotsBuild(slots, m, at, T).map((o) => { o.id = `O${++k}`; return o; }); },
    };
  };
}

function slotsBuild(slots, m, at, T) {
  const out = [];
  let x = 0;
  for (const s of slots) {
    if (s.plat) { x = s.plat(x, T).end + 2.2; continue; }
    const len = s.len ?? 12;
    const ox = s.gap ? x + len + s.gap / 2 : x + (s.at ?? 6.5);
    for (const o of [].concat(s.o(m, at(ox), T))) { o.label = s.n; out.push(o); }
    if (s.tramp) {
      const tx = x + len + 5.6;
      const t = new Trampoline(m, { id: 'T', x: at(tx), top: T - 1.5 }); t.label = s.n; out.push(t);
      x = tx + 11 + 2.2;
      continue;
    }
    x += len + (s.gap ?? 2.2);
  }
  return out;
}

// --------------------------------------------------------------- platform challenges
const stepBlocks = (x0, T) => {
  const b = blocks(x0 + 0.8, [T + 0.3, T + 0.7, T + 1.1, T + 0.6]);
  return { platforms: b, end: b[b.length - 1].x1, coins: [{ x: x0 + 9.8, y: T + 2.8 }] };
};
const lifts = (x0, T) => {
  // a rising staircase of hydraulic lifts, each bobbing a little out of step with the next
  const p = [0, 1, 2, 3].map((i) => ({ x0: x0 + 0.8 + i * 4.8, x1: x0 + 0.8 + i * 4.8 + 3.2, t0: T + 0.3 + i * 0.4, kind: 'lift', amp: 0.45, period: 3.2, phase: i * 0.8 }));
  return { platforms: p, end: p[p.length - 1].x1, coins: [{ x: x0 + 14.3, y: T + 2.6 }] };
};
const glass = (x0, T) => {
  // flat hops: 5.3 m pitch = one full jump, so you land in the same spot on every panel
  const p = [0, 1, 2, 3, 4].map((i) => ({ x0: x0 + 0.8 + i * 5.3, x1: x0 + 0.8 + i * 5.3 + 2.6, t0: T, kind: 'blink', period: 3.0, on: 0.66, phase: -i * 0.74 })); // vanishes as a wave right behind a runner who keeps going
  return { platforms: p, end: p[p.length - 1].x1, coins: [{ x: x0 + 9.2, y: T + 1.9 }, { x: x0 + 19.2, y: T + 1.9 }] };
};
const orbs = (x0, T) => {
  const p = balls(x0 + 1.45, 4, T + 0.35);
  return { platforms: p, end: p[p.length - 1].x1, coins: [{ x: x0 + 5.45, y: T + 2.4 }] };
};

// --------------------------------------------------------------- the 50 obstacles
const Z1 = [ // NEON LAUNCH
  { n: 'Neon Paddle Log', o: (m, x, T) => new PaddleLog(m, { id: 'x', x, top: T, arms: 2, speed: 1.25 }) },
  { n: 'Low Laser', o: (m, x, T) => new LaserGate(m, { id: 'x', x, top: T, h: 0.42, period: 2.4 }) },
  { n: 'Spinning Blocker', o: (m, x, T) => new VerticalBlocker(m, { id: 'x', x, top: T, speed: 1.0 }) },
  { n: 'Wrecking Ball', o: (m, x, T) => new SwingingBall(m, { id: 'x', x, top: T, period: 3.2 }) },
  { n: 'High Laser', chev: true, boost: true, o: (m, x, T) => new LaserGate(m, { id: 'x', x, top: T, h: 1.2, period: 2.6, on: 0.6, color: 'pink' }) },
  { n: 'Gap Spinner', gap: 3.4, o: (m, x, T) => new GapSpinner(m, { id: 'x', x, top: T, speed: 1.0, hubH: 0.4 }) },
  { n: 'Neon Low Beam', o: (m, x, T) => new SlideBeam(m, { id: 'x', x, top: T }) },
  { n: 'Swing Gate', o: (m, x, T) => new SwingGate(m, { id: 'x', x, top: T, period: 4.0 }) },
  { n: 'Flame Jets', o: (m, x, T) => new FlameJets(m, { id: 'x', x, top: T, period: 2.6 }) },
  { n: 'Neon Sweeper', o: (m, x, T) => new Sweeper(m, { id: 'x', x, top: T, speed: 2.0 }) },
  { plat: stepBlocks },
];
const Z2 = [ // LASER DISTRICT
  { n: 'Propeller Rotor', o: (m, x, T) => new Rotor(m, { id: 'x', x, top: T, speed: 1.35 }) },
  { n: 'Laser Spinner', o: (m, x, T) => new LaserSpinner(m, { id: 'x', x, top: T, speed: 1.2 }) },
  { n: 'Swinging Barrel', o: (m, x, T) => new Pendulum(m, { id: 'x', x, top: T, shape: 'barrel', period: 3.0 }) },
  { n: 'Laser Grid', o: (m, x, T) => new LaserGrid(m, { id: 'x', x, top: T, period: 2.8 }) },
  { n: 'Iron Roller Gate', o: (m, x, T) => new IronRoller(m, { id: 'x', x, top: T, speed: 1.25 }) },
  { n: 'Tesla Gate', o: (m, x, T) => new TeslaGate(m, { id: 'x', x, top: T, period: 2.8 }) },
  { n: 'Piston Stamper', o: (m, x, T) => new Stamper(m, { id: 'x', x, top: T, period: 2.6 }) },
  { n: 'Patrol Drone', o: (m, x, T) => new Drone(m, { id: 'x', x, top: T, period: 2.8 }) },
  { n: 'Wheel Spinner', o: (m, x, T) => new WheelSpinner(m, { id: 'x', x, top: T, speed: 1.1 }) },
  { n: 'Pop-up Bollards', o: (m, x, T) => new Bollards(m, { id: 'x', x, top: T, period: 2.9 }) },
  { plat: lifts },
];
const Z3 = [ // FIRE ZONE
  { n: 'Plasma Cannon', o: (m, x, T) => new SideCannon(m, { id: 'x', x, top: T, period: 2.2 }) },
  { n: 'Meteor Drop', o: (m, x, T) => new Meteor(m, { id: 'x', x, top: T, period: 3.0 }) },
  { n: 'Blade Pendulum', o: (m, x, T) => new BladePendulum(m, { id: 'x', x, top: T }) },
  { n: 'Saw Track', o: (m, x, T) => new SawTrack(m, { id: 'x', x, top: T, period: 2.4 }) },
  { n: 'Skull Crate', o: (m, x, T) => new SkullCrate(m, { id: 'x', x, top: T, period: 3.0 }) },
  { n: 'Fire Hoop', o: (m, x, T) => new FireHoop(m, { id: 'x', x, top: T, period: 2.6, r: 1.6, bob: 0.35 }) },
  { n: 'Vertical Wheel', o: (m, x, T) => new VerticalWheel(m, { id: 'x', x, top: T }) },
  { n: 'Anchor Pendulum', o: (m, x, T) => new Pendulum(m, { id: 'x', x, top: T, shape: 'anchor', period: 3.2 }) },
  { n: 'Inferno Vents', o: (m, x, T) => new FlameJets(m, { id: 'x', x, top: T, period: 2.4, on: 0.38, span: 2.2 }) },
  { n: 'Wind Fan', at: 10.5, o: (m, x, T) => new WindFan(m, { id: 'x', x, top: T, period: 3.2, strength: 20 }) },
  { plat: glass },
];
const Z4 = [ // MACHINE HALL
  { n: 'Neon Spin Bar', o: (m, x, T) => new SpinBar(m, { id: 'x', x, top: T, look: 'neon', h: 0.55, speed: 1.3 }) },
  { n: 'Neon Rotor Pipes', chev: true, boost: true, o: (m, x, T) => new SpinBar(m, { id: 'x', x, top: T, look: 'upipe', h: 1.34, len: 3.1, arms: 3, speed: 1.3 }) },
  { n: 'Neon Pusher', o: (m, x, T) => new Pusher(m, { id: 'x', x, top: T, look: 'neon', w: 1.3, period: 2.8 }) },
  { n: 'Ceiling Crusher', o: (m, x, T) => new Press(m, { id: 'x', x, top: T, look: 'neon', w: 1.6, period: 2.8 }) },
  { n: 'Neon Hammer', o: (m, x, T) => new LaneSwing(m, { id: 'x', x, top: T, look: 'hammer', period: 2.6, len: 3.4, pivotH: 4.9 }) },
  { n: 'Plasma Orb', o: (m, x, T) => new CrossSwing(m, { id: 'x', x, top: T, look: 'orb', pivotH: 6.15, len: 4.6, r: 0.75, period: 3.0 }) },
  { n: 'Neon Windmill', o: (m, x, T) => new Windmill(m, { id: 'x', x, top: T, look: 'neon', blades: 3, speed: 1.0 }) },
  { n: 'Rolling Reactor', o: (m, x, T) => new Roller(m, { id: 'x', x, top: T, look: 'neon', r: 0.5, period: 2.4 }) },
  { n: 'Laser Axe', o: (m, x, T) => new LaneSwing(m, { id: 'x', x, top: T, look: 'axe', period: 2.6, len: 3.3, pivotH: 4.9, phase: 1 }) },
  { n: 'Trampoline Leap', tramp: true, o: () => [] },
  { plat: orbs },
];
const Z5 = [ // FINAL GAUNTLET
  { n: 'Meteor Shower', o: (m, x, T) => [new Meteor(m, { id: 'x', x: x - 1.8, top: T, period: 2.4 }), new Meteor(m, { id: 'y', x: x + 1.8, top: T, period: 2.4, phase: 1.2 })] },
  { n: 'Pulse Laser', o: (m, x, T) => new LaserGate(m, { id: 'x', x, top: T, h: 0.42, period: 1.6, on: 0.5, color: 'green' }) },
  { n: 'Twin Sweepers', o: (m, x, T) => [new Sweeper(m, { id: 'x', x: x - 1.2, top: T, speed: 1.8 }), new Sweeper(m, { id: 'y', x: x + 3.0, top: T, speed: 1.8, phase: Math.PI })] },
  { n: 'Hyper Rotor', o: (m, x, T) => new Rotor(m, { id: 'x', x, top: T, speed: 1.8 }) },
  { n: 'Twin Saws', len: 17, at: 8.5, o: (m, x, T) => [new SawTrack(m, { id: 'x', x: x - 3.8, top: T, span: 0.8, period: 2.6 }), new SawTrack(m, { id: 'y', x: x + 3.8, top: T, span: 0.8, period: 2.6, phase: 1.3 })] },
  { n: 'Bollard Wave', o: (m, x, T) => new Bollards(m, { id: 'x', x, top: T, period: 2.4 }) },
  { n: 'Storm Gate', o: (m, x, T) => new TeslaGate(m, { id: 'x', x, top: T, period: 2.2, on: 0.45 }) },
  { n: 'Turbine', o: (m, x, T) => new Windmill(m, { id: 'x', x, top: T, look: 'neon', blades: 4, speed: 0.85 }) },
  { n: 'Double Orbs', o: (m, x, T) => [new CrossSwing(m, { id: 'x', x: x - 1.5, top: T, look: 'orb', pivotH: 6.15, len: 4.6, r: 0.7, period: 2.8 }), new CrossSwing(m, { id: 'y', x: x + 2.0, top: T, look: 'orb', pivotH: 6.15, len: 4.6, r: 0.7, period: 2.8, phase: Math.PI })] },
  { n: 'Ring of Fire', o: (m, x, T) => new FireHoop(m, { id: 'x', x, top: T, period: 2.2, r: 1.55, bob: 0.4 }) },
];

const zones = [Z1, Z2, Z3, Z4, Z5].map(zoneAt);

export const E6 = composeEpisode({
  id: 'E6', episode: 6,
  title: 'EPISODE 06', subtitle: 'Grand Finale',
  theme: 'night', top: DECK_TOP + HIGH, high: true, timeLimit: 480, stars: [160, 220],
  goals: ['stars3', 'nofall', 'coins'],
  obstacleCount: 50,
}, zones);
