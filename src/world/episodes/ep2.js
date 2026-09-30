import { DECK_TOP } from '../../config.js';
import {
  Sweeper, Rotor, Pendulum, IronRoller, Stamper, WheelSpinner, SideCannon, BladePendulum,
  SkullCrate, VerticalWheel, SharkLeap, skullCrateProp,
} from '../pirate.js';
import { composeEpisode, blocks, balls } from './compose.js';

// Episode 2: Pirate Cove. The three reference rounds joined into one long run.

const cove = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 66, t0: T },
    ...blocks(69.0, [T + 0.3, T + 0.7, T + 0.3]),
    { x0: 83.8, x1: 94, t0: T },
    { x0: 96.0, x1: 100.4, t0: T, kind: 'round' },
    { x0: 101.6, x1: 107.5, t0: T, chev: true }, // short gap: jumping the spinner's handles carries you across
  ],
  boosts: [{ x0: 28.8, x1: 31.2 }],
  coins: [
    { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 17, h: 0.9 }, { x: 27.2, y: T + 1.6 }, { x: 31.8, h: 0.45 },
    { x: 41.2, y: T + 1.6 }, { x: 50, h: 0.9 }, { x: 57, h: 0.9 }, { x: 75.2, y: T + 2.3 }, { x: 92.4, h: 0.9 }, { x: 104.2, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new SkullCrate(m, { id: 'O1', x: at(6.5), top: T, period: 3.2 }),
    new Sweeper(m, { id: 'O2', x: at(20), top: T, speed: 2.0 }),
    new Rotor(m, { id: 'O3', x: at(34.5), top: T, speed: 1.35 }),
    new Pendulum(m, { id: 'O4', x: at(47.2), top: T, shape: 'barrel', period: 3.0 }),
    new IronRoller(m, { id: 'O5', x: at(60.2), top: T, speed: 1.25 }),
    new Stamper(m, { id: 'O6', x: at(89.5), top: T, period: 2.6 }),
    new WheelSpinner(m, { id: 'O7', x: at(98.2), top: T, speed: 1.1 }),
  ],
  decor: (m, at) => [
    new SharkLeap(m, { x: at(25), period: 6.5 }),
    { group: skullCrateProp(m, at(11.2), T, -0.75, 0.7) },
    { group: skullCrateProp(m, at(65.2), T, 0.8, 0.6) },
  ],
});

const cannons = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 64, t0: T },
    { x0: 66.4, x1: 78, t0: T },
    ...blocks(81.0, [T + 0.2, T + 0.5, T + 0.8], 4.8), // climbing: shorter jumps, so a shorter pitch
    { x0: 95.4, x1: 104.6, t0: T + 0.4, chev: true },
  ],
  boosts: [{ x0: 28.8, x1: 30.6 }], // boost + slide under the barrel
  coins: [
    { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 20.2, h: 0.9 }, { x: 27.2, y: T + 1.6 }, { x: 31.2, h: 0.45 },
    { x: 41.2, y: T + 1.6 }, { x: 45, h: 0.9 }, { x: 53.2, y: T + 1.6 }, { x: 65.2, y: T + 1.6 }, { x: 87.0, y: T + 1.9 }, { x: 97.6, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new Rotor(m, { id: 'O1', x: at(6), top: T, speed: 1.3 }),
    new SideCannon(m, { id: 'O2', x: at(18), top: T, period: 2.2 }),
    new SideCannon(m, { id: 'O3', x: at(22.5), top: T, period: 2.2, phase: 1.1 }),
    new Pendulum(m, { id: 'O4', x: at(34), top: T, shape: 'barrel', period: 2.8, phase: 1.2 }),
    new BladePendulum(m, { id: 'O5', x: at(47.6), top: T }),
    new SkullCrate(m, { id: 'O6', x: at(60), top: T, period: 2.8 }),
    new Sweeper(m, { id: 'O7', x: at(72.2), top: T, speed: 2.2, phase: 1 }),
    new SideCannon(m, { id: 'O8', x: at(76.2), top: T, period: 2.4, phase: 0.5 }),
    new Rotor(m, { id: 'O9', x: at(101.2), top: T + 0.4, speed: 1.45, phase: 0.8 }),
  ],
  decor: (m, at) => [
    new SharkLeap(m, { x: at(40.5), period: 6 }),
    { group: skullCrateProp(m, at(51.2), T, 0.8, 0.6) },
  ],
});

const bigBalls = (T) => ({
  platforms: [
    { x0: 0, x1: 13.5, t0: T },
    { x0: 15.7, x1: 27.5, t0: T },
    { x0: 29.9, x1: 41.5, t0: T },
    ...blocks(44.5, [T + 0.5, T + 0.9, T + 0.5]),
    { x0: 59.1, x1: 67.1, t0: T + 0.5, t1: T, chev: true }, // downhill ramp: slide it for speed
    { x0: 67.1, x1: 79.1, t0: T },
    ...balls(82.75, 4, T + 0.35), // hop ball to ball without stopping
    { x0: 102.7, x1: 111.1, t0: T },
  ],
  checkpoints: [77.1], // past the vertical wheel, before the balls
  coins: [
    { x: 3, h: 0.9 }, { x: 14.6, y: T + 1.6 }, { x: 25.5, h: 0.9 }, { x: 28.7, y: T + 1.6 }, { x: 48.1, y: T + 2.1 },
    { x: 53.1, y: T + 2.4 }, { x: 63.1, h: 0.9 }, { x: 86.75, y: T + 2.4 }, { x: 97.35, y: T + 2.4 },
  ],
  obstacles: (m, at) => [
    new IronRoller(m, { id: 'O1', x: at(6.0), top: T, speed: 1.3 }),
    new Pendulum(m, { id: 'O2', x: at(21.5), top: T, shape: 'anchor', period: 3.2 }),
    new SkullCrate(m, { id: 'O3', x: at(34.3), top: T, period: 3.0 }),
    new Sweeper(m, { id: 'O4', x: at(38.5), top: T, speed: 1.9, phase: 2 }),
    new VerticalWheel(m, { id: 'O5', x: at(73.5), top: T }),
    // punches down into the gap between balls 2 and 3: hop through while it is up
    new Stamper(m, { id: 'O6', x: at(92.05), top: T + 0.35, down: T + 1.4, upH: 3.9, period: 2.8, hold: 0.16, rise: 0.2 }),
    new Rotor(m, { id: 'O7', x: at(108.1), top: T, speed: 1.4 }),
  ],
  decor: (m, at) => [
    new SharkLeap(m, { x: at(25.5), period: 5.5, phase: 2 }),
    new SharkLeap(m, { x: at(91.5), period: 7, phase: 4, z: -4.6 }),
  ],
});

export const E2 = composeEpisode({
  id: 'E2', episode: 2,
  title: 'EPISODE 02', subtitle: 'Pirate Cove',
  theme: 'pirate', top: DECK_TOP, timeLimit: 180, stars: [63, 88],
  goals: ['stars3', 'slide5', 'slidejump'],
}, [cove, cannons, bigBalls]);
