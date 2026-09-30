import { DECK_TOP } from '../../config.js';
import { IronRoller } from '../pirate.js';
import { SpinBar, Pusher, LaneSwing, CrossSwing, Windmill } from '../generic.js';
import { composeEpisode, blocks, balls } from './compose.js';

// Episode 3: Steel Works. Grey riveted pipe decks on black pipe legs, heavy black
// hazards: pan spinners, rainbow-faced pistons, swinging black claws, spiked maces,
// gold U-pipe rotors and big stone balls on yellow poles.

const pipeline = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 66, t0: T },
    ...blocks(69.0, [T + 0.3, T + 0.7, T + 0.3]),
    { x0: 83.8, x1: 94, t0: T },
    { x0: 96.2, x1: 107, t0: T },
  ],
  boosts: [{ x0: 28.8, x1: 30.6 }],
  coins: [
    { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 24, h: 0.9 }, { x: 31.6, h: 0.45 }, { x: 41.2, y: T + 1.6 },
    { x: 57, h: 0.9 }, { x: 75.2, y: T + 2.3 }, { x: 92.8, h: 0.9 }, { x: 98, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new SpinBar(m, { id: 'O1', x: at(6.5), top: T, look: 'pan', h: 0.55, speed: 1.3 }),
    new Pusher(m, { id: 'O2', x: at(20), top: T, look: 'piston', period: 2.6 }),
    new SpinBar(m, { id: 'O3', x: at(34.5), top: T, look: 'upipe', h: 1.34, len: 3.1, speed: 1.3, arms: 3 }),
    new LaneSwing(m, { id: 'O4', x: at(48.0), top: T, look: 'claw', period: 2.8, amp: 0.7, pivotH: 5.5 }),
    new IronRoller(m, { id: 'O5', x: at(60.2), top: T, speed: 1.25 }),
    new Pusher(m, { id: 'O6', x: at(87.6), top: T, look: 'piston', period: 2.8 }),
    new Pusher(m, { id: 'O7', x: at(90.6), top: T, look: 'piston', period: 2.8, phase: -0.35 }), // retracts just after the first one
    new LaneSwing(m, { id: 'O8', x: at(101.8), top: T, look: 'claw', period: 2.8, amp: 0.7, pivotH: 5.5, phase: 1 }),
  ],
});

const heavy = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 64, t0: T },
    ...balls(67.65, 4, T + 0.35), // stone balls on yellow poles
    { x0: 87.6, x1: 99, t0: T },
    { x0: 101.2, x1: 110, t0: T, chev: true },
  ],
  coins: [
    { x: 3, h: 0.9 }, { x: 17, h: 0.9 }, { x: 27.2, y: T + 1.6 }, { x: 45, h: 0.9 }, { x: 58, h: 0.9 },
    { x: 71.65, y: T + 2.4 }, { x: 82.25, y: T + 2.4 }, { x: 90, h: 0.9 }, { x: 108, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new CrossSwing(m, { id: 'O1', x: at(6.5), top: T, look: 'mace', r: 0.62, pivotH: 6.0, len: 4.5, period: 3.0 }),
    new SpinBar(m, { id: 'O2', x: at(20), top: T, look: 'pan', h: 0.55, speed: 1.7, phase: 1 }),
    new CrossSwing(m, { id: 'O3', x: at(32.6), top: T, look: 'mace', r: 0.62, pivotH: 6.0, len: 4.5, period: 2.7, phase: 1.5 }),
    new Pusher(m, { id: 'O4', x: at(37.2), top: T, look: 'piston', period: 2.4 }),
    new Windmill(m, { id: 'O5', x: at(47.2), top: T, look: 'steel', blades: 3, speed: 1.0 }),
    new SpinBar(m, { id: 'O6', x: at(94), top: T, look: 'upipe', h: 1.34, len: 3.1, speed: 1.4, arms: 3, phase: 0.6 }),
    new Pusher(m, { id: 'O7', x: at(105.6), top: T, look: 'piston', period: 2.2 }),
  ],
});

export const E3 = composeEpisode({
  id: 'E3', episode: 3,
  title: 'EPISODE 03', subtitle: 'Steel Works',
  theme: 'steel', top: DECK_TOP, timeLimit: 150, stars: [45, 62],
  goals: ['stars3', 'coins', 'nofall'],
}, [pipeline, heavy]);
