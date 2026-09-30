import { DECK_TOP } from '../../config.js';
import { SwingGate } from '../obstacles.js';
import { SpinBar, Pusher, Press, LaneSwing, CrossSwing, Windmill } from '../generic.js';
import { composeEpisode, blocks, balls } from './compose.js';

// Episode 5: Candy Land. Pink padded decks, rainbow ramps, peppermint pendulums,
// green jelly pushers and presses, donut and cookie spinners, lollipop poles,
// pinwheel windmills, revolving panels and red-and-white mushroom balls.

const sugarRush = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    ...balls(55.65, 4, T + 0.35), // mushroom balls
    { x0: 75.6, x1: 88, t0: T },
  ],
  boosts: [{ x0: 28.8, x1: 30.6 }],
  coins: [
    { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 24, h: 0.9 }, { x: 31.6, h: 0.45 }, { x: 45, h: 0.9 },
    { x: 59.65, y: T + 2.4 }, { x: 70.25, y: T + 2.4 }, { x: 86, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new Pusher(m, { id: 'O1', x: at(6.5), top: T, look: 'jelly', w: 1.3, period: 2.8 }),
    new CrossSwing(m, { id: 'O2', x: at(20), top: T, look: 'mint', pivotH: 6.15, len: 4.6, r: 0.75, period: 3.0 }),
    new SpinBar(m, { id: 'O3', x: at(34.5), top: T, look: 'donut', h: 0.55, len: 3.0, speed: 1.3 }),
    new Press(m, { id: 'O4', x: at(47.2), top: T, look: 'jelly', period: 2.8 }),
    new Windmill(m, { id: 'O5', x: at(81.6), top: T, look: 'pinwheel', blades: 4, speed: 0.75 }),
  ],
});

const lollipop = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T },
    ...blocks(43.0, [T + 0.3, T + 0.7, T + 0.3]), // jelly blocks
    { x0: 57.8, x1: 70, t0: T },
    { x0: 72.2, x1: 84, t0: T, chev: true },
  ],
  coins: [
    { x: 2.5, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 25, h: 0.9 }, { x: 31, h: 0.9 }, { x: 49.2, y: T + 2.3 },
    { x: 60, h: 0.9 }, { x: 71.1, y: T + 1.6 }, { x: 82.5, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new LaneSwing(m, { id: 'O1', x: at(6.5), top: T, look: 'pole', period: 2.6, len: 3.4, pivotH: 4.35 }),
    new SwingGate(m, { id: 'O2', x: at(20.0), top: T, period: 4.0 }),
    new SwingGate(m, { id: 'O3', x: at(24.2), top: T, period: 4.0, phase: -0.9 }), // opens in a wave with the first
    new SpinBar(m, { id: 'O4', x: at(34.5), top: T, look: 'cookie', h: 0.55, len: 3.1, arms: 4, speed: 1.0 }),
    new CrossSwing(m, { id: 'O5', x: at(63.8), top: T, look: 'mint', pivotH: 6.15, len: 4.6, r: 0.75, period: 2.6, phase: 1 }),
    new Pusher(m, { id: 'O6', x: at(76), top: T, look: 'jelly', w: 1.3, period: 2.6 }),
    new Pusher(m, { id: 'O7', x: at(80), top: T, look: 'jelly', w: 1.3, period: 2.6, phase: 1.3 }),
  ],
});

const rainbowFinale = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T, chev: true },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T },
    ...balls(43.65, 4, T + 0.35),
    { x0: 63.6, x1: 75, t0: T },
    { x0: 77.2, x1: 88, t0: T },
  ],
  coins: [
    { x: 2.5, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 24.5, h: 0.9 }, { x: 30, h: 0.9 }, { x: 47.65, y: T + 2.4 },
    { x: 58.25, y: T + 2.4 }, { x: 66, h: 0.9 }, { x: 86, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new LaneSwing(m, { id: 'O1', x: at(6.5), top: T, look: 'pole', period: 2.8, len: 3.4, pivotH: 4.35, amp: 0.9 }),
    new Windmill(m, { id: 'O3', x: at(20), top: T, look: 'pinwheel', blades: 4, speed: 1.0 }),
    new Press(m, { id: 'O4', x: at(32), top: T, look: 'jelly', period: 2.6 }),
    new SpinBar(m, { id: 'O5', x: at(36.8), top: T, look: 'donut', h: 0.55, len: 3.0, speed: 1.5, phase: 1 }),
    new CrossSwing(m, { id: 'O6', x: at(69.5), top: T, look: 'mint', pivotH: 6.15, len: 4.6, r: 0.75, period: 2.8 }),
    new SwingGate(m, { id: 'O7', x: at(83.4), top: T, period: 4.0, phase: 0.5 }),
  ],
});

export const E5 = composeEpisode({
  id: 'E5', episode: 5,
  title: 'EPISODE 05', subtitle: 'Candy Land',
  theme: 'candy', top: DECK_TOP, timeLimit: 190, stars: [53, 75],
  goals: ['stars3', 'coins', 'slidejump'],
}, [sugarRush, lollipop, rainbowFinale]);
