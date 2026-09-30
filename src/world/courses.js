import { DECK_TOP as T } from '../config.js';
import { PaddleLog, VerticalBlocker, SwingingBall, GapSpinner, SwingGate, SlideBeam } from './obstacles.js';
import {
  Sweeper, Rotor, Pendulum, IronRoller, Stamper, WheelSpinner, SideCannon, BladePendulum,
  SkullCrate, VerticalWheel, SharkLeap, skullCrateProp,
} from './pirate.js';

// Every round is data: platforms left→right along +X (the runner's lane is z = 0),
// obstacles, coins, boost strips, time limit and star times.
//   stars: [3-star time, 2-star time] in seconds of elapsed time
//   goals: secondary goals shown on the result screen (see GOALS in game.js)

// ------------------------------------------------------------------ Episode 1
const E1R1 = {
  id: 'E1R1', episode: 1, round: 1,
  title: 'ROUND 01', subtitle: 'The Log Run',
  theme: 'pool', countdown: false, timeLimit: 150, stars: [45, 75],
  goals: ['nofall', 'stars3'],
  platforms: [
    { x0: -6, x1: 12, t0: T, kind: 'start' },
    { x0: 14.4, x1: 26.5, t0: T },                 // O1
    { x0: 29.0, x1: 40.5, t0: T },                 // O2
    { x0: 42.9, x1: 52.0, t0: T },                 // O3
    // water gap 52.0 → 55.4 with O4 spinning in it
    { x0: 55.4, x1: 61.0, t0: T, t1: T + 0.7 },    // angled platform (ramp up)
    { x0: 61.0, x1: 68.0, t0: T + 0.7 },           // slide beam
    { x0: 70.4, x1: 82.0, t0: T },                 // O5
    { x0: 84.4, x1: 95.0, t0: T },                 // O6
    { x0: 97.4, x1: 114, t0: T + 1.2, kind: 'finish' }, // O7 raised final platform
  ],
  finishX: 106,
  obstacles: (mats) => [
    new PaddleLog(mats, { id: 'O1', x: 20.5, top: T, arms: 2, speed: 1.25 }),
    new VerticalBlocker(mats, { id: 'O2', x: 34.8, top: T, speed: 1.0 }),
    new SwingingBall(mats, { id: 'O3', x: 47.4, top: T, period: 3.2 }),
    new GapSpinner(mats, { id: 'O4', x: 53.7, top: T, speed: 1.0, hubH: 0.4 }),
    new SlideBeam(mats, { id: 'SL', x: 64.6, top: T + 0.7 }),
    new PaddleLog(mats, { id: 'O5', x: 76.2, top: T, arms: 2, speed: 1.6, phase: 0.7, color: 'padOrange' }),
    new SwingGate(mats, { id: 'O6', x: 90.0, top: T, period: 3.4 }),
  ],
};

// ------------------------------------------------------------------ Episode 2 (pirate cove)
const TOWER = [
  { x0: -11.5, x1: -8, t0: T + 3.4, kind: 'tower' },
  { x0: -8, x1: 0, t0: T + 3.4, t1: T, kind: 'ramp' }, // chevron slide ramp: slide down it for speed
];
const onRamp = (x) => T + 3.4 * (-x / 8);
// stepping blocks 2.4 m long; `pitch` = distance start-to-start (a full-speed jump is ~5.3 m)
const blocks = (x0, tops, pitch = 5.0) => tops.map((t0, i) => ({ x0: x0 + i * pitch, x1: x0 + i * pitch + 2.4, t0, kind: 'block' }));

const E2R1 = {
  id: 'E2R1', episode: 2, round: 1,
  title: 'ROUND 01', subtitle: 'Pirate Cove',
  theme: 'pirate', countdown: true, timeLimit: 60, stars: [28, 42],
  goals: ['stars3', 'slide5'],
  platforms: [
    ...TOWER,
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 66, t0: T },
    // stepping blocks: 5 m pitch so one full-speed jump lands block to block
    ...blocks(69.0, [T + 0.3, T + 0.7, T + 0.3]),
    { x0: 83.8, x1: 94, t0: T },
    { x0: 96.0, x1: 100.4, t0: T, kind: 'round' },
    { x0: 101.6, x1: 107.5, t0: T, chev: true }, // short gap: jumping the spinner's handles carries you across
    { x0: 109.3, x1: 113.7, t0: T + 0.9, kind: 'nest' },
  ],
  finishX: 110.2,
  boosts: [{ x0: 28.8, x1: 31.2 }],
  coins: [
    { x: -4, y: onRamp(-4) + 0.8 }, { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 17, h: 0.9 },
    { x: 27.2, y: T + 1.6 }, { x: 31.8, h: 0.45 }, { x: 41.2, y: T + 1.6 }, { x: 50, h: 0.9 },
    { x: 57, h: 0.9 }, { x: 75.2, y: T + 2.3 }, { x: 92.4, h: 0.9 }, { x: 104.2, h: 0.9 },
  ],
  obstacles: (mats) => [
    new SkullCrate(mats, { id: 'O1', x: 6.5, top: T, period: 3.2 }),
    new Sweeper(mats, { id: 'O2', x: 20, top: T, speed: 2.0 }),
    new Rotor(mats, { id: 'O3', x: 34.5, top: T, speed: 1.35 }),
    new Pendulum(mats, { id: 'O4', x: 47.2, top: T, shape: 'barrel', period: 3.0 }),
    new IronRoller(mats, { id: 'O5', x: 60.2, top: T, speed: 1.25 }),
    new Stamper(mats, { id: 'O6', x: 89.5, top: T, period: 2.6 }),
    new WheelSpinner(mats, { id: 'O7', x: 98.2, top: T, speed: 1.1 }),
  ],
  decor: (mats) => [
    new SharkLeap(mats, { x: 25, period: 6.5 }),
    { group: skullCrateProp(mats, 11.2, T, -0.75, 0.7) },
    { group: skullCrateProp(mats, 65.2, T, 0.8, 0.6) },
  ],
};

const E2R2 = {
  id: 'E2R2', episode: 2, round: 2,
  title: 'ROUND 02', subtitle: 'Cannon Deck',
  theme: 'pirate', countdown: true, timeLimit: 60, stars: [28, 42],
  goals: ['stars3', 'slidejump'],
  platforms: [
    ...TOWER,
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 64, t0: T },
    { x0: 66.4, x1: 78, t0: T },
    ...blocks(81.0, [T + 0.2, T + 0.5, T + 0.8], 4.8), // climbing: shorter jumps, so a shorter pitch
    { x0: 95.4, x1: 104.6, t0: T + 0.4, chev: true },
    { x0: 106.4, x1: 110.8, t0: T + 1.0, kind: 'nest' },
  ],
  finishX: 107.3,
  boosts: [{ x0: 28.8, x1: 30.6 }], // boost + slide under the barrel
  coins: [
    { x: -4, y: onRamp(-4) + 0.8 }, { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 20.2, h: 0.9 },
    { x: 27.2, y: T + 1.6 }, { x: 31.2, h: 0.45 }, { x: 41.2, y: T + 1.6 }, { x: 45, h: 0.9 },
    { x: 53.2, y: T + 1.6 }, { x: 65.2, y: T + 1.6 }, { x: 87.0, y: T + 1.9 }, { x: 97.6, h: 0.9 },
  ],
  obstacles: (mats) => [
    new Rotor(mats, { id: 'O1', x: 6, top: T, speed: 1.3 }),
    new SideCannon(mats, { id: 'O2', x: 18, top: T, period: 2.2 }),
    new SideCannon(mats, { id: 'O3', x: 22.5, top: T, period: 2.2, phase: 1.1 }),
    new Pendulum(mats, { id: 'O4', x: 34, top: T, shape: 'barrel', period: 2.8, phase: 1.2 }),
    new BladePendulum(mats, { id: 'O5', x: 47.6, top: T }),
    new SkullCrate(mats, { id: 'O6', x: 60, top: T, period: 2.8 }),
    new Sweeper(mats, { id: 'O7', x: 72.2, top: T, speed: 2.2, phase: 1 }),
    new SideCannon(mats, { id: 'O8', x: 76.2, top: T, period: 2.4, phase: 0.5 }),
    new Rotor(mats, { id: 'O9', x: 101.2, top: T + 0.4, speed: 1.45, phase: 0.8 }),
  ],
  decor: (mats) => [
    new SharkLeap(mats, { x: 40.5, period: 6 }),
    { group: skullCrateProp(mats, 51.2, T, 0.8, 0.6) },
  ],
};

const E2R3 = {
  id: 'E2R3', episode: 2, round: 3,
  title: 'ROUND 03', subtitle: 'Big Balls',
  theme: 'pirate', countdown: true, timeLimit: 80, stars: [36, 52],
  goals: ['coins', 'nofall'],
  platforms: [
    ...TOWER,
    { x0: 0, x1: 13.5, t0: T }, // long: you arrive fast from the tower slide
    { x0: 15.7, x1: 27.5, t0: T },
    { x0: 29.9, x1: 41.5, t0: T },
    ...blocks(44.5, [T + 0.5, T + 0.9, T + 0.5]),
    { x0: 59.1, x1: 67.1, t0: T + 0.5, t1: T, chev: true }, // downhill ramp: slide it for speed
    { x0: 67.1, x1: 79.1, t0: T },
    // big bobbing balls, 5.3 m apart (= one full jump): hop ball to ball without stopping
    ...[0, 1, 2, 3].map((i) => ({ x0: 82.75 + i * 5.3, x1: 85.45 + i * 5.3, t0: T + 0.35, kind: 'ball', bob: 0.16, bobPhase: i * 1.6 })),
    { x0: 102.7, x1: 111.1, t0: T },
    { x0: 113.1, x1: 117.5, t0: T + 0.9, kind: 'nest' },
  ],
  finishX: 114,
  checkpoints: [77.1], // past the vertical wheel, before the balls
  coins: [
    { x: -4, y: onRamp(-4) + 0.8 }, { x: 3, h: 0.9 }, { x: 14.6, y: T + 1.6 }, { x: 25.5, h: 0.9 },
    { x: 28.7, y: T + 1.6 }, { x: 48.1, y: T + 2.1 }, { x: 53.1, y: T + 2.4 }, { x: 63.1, h: 0.9 },
    { x: 86.75, y: T + 2.4 }, { x: 97.35, y: T + 2.4 },
  ],
  obstacles: (mats) => [
    new IronRoller(mats, { id: 'O1', x: 6.0, top: T, speed: 1.3 }),
    new Pendulum(mats, { id: 'O2', x: 21.5, top: T, shape: 'anchor', period: 3.2 }),
    new SkullCrate(mats, { id: 'O3', x: 34.3, top: T, period: 3.0 }),
    new Sweeper(mats, { id: 'O4', x: 38.5, top: T, speed: 1.9, phase: 2 }),
    new VerticalWheel(mats, { id: 'O5', x: 73.5, top: T }),
    // punches down into the gap between balls 2 and 3: hop through while it is up
    new Stamper(mats, { id: 'O6', x: 92.05, top: T + 0.35, down: T + 1.4, upH: 3.9, period: 2.8, hold: 0.16, rise: 0.2 }),
    new Rotor(mats, { id: 'O7', x: 108.1, top: T, speed: 1.4 }),
  ],
  decor: (mats) => [
    new SharkLeap(mats, { x: 25.5, period: 5.5, phase: 2 }),
    new SharkLeap(mats, { x: 91.5, period: 7, phase: 4, z: -4.6 }),
  ],
};

export const EPISODES = [
  { id: 1, title: 'EPISODE 1', subtitle: 'The Log Run', rounds: [E1R1, null, null] },
  { id: 2, title: 'EPISODE 2', subtitle: 'Pirate Cove', rounds: [E2R1, E2R2, E2R3] },
];

export const ROUNDS = Object.fromEntries(EPISODES.flatMap((e) => e.rounds.filter(Boolean).map((r) => [r.id, r])));
