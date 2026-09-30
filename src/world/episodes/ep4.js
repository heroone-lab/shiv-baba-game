import { DECK_TOP } from '../../config.js';
import { Sweeper, Rotor } from '../pirate.js';
import { Pusher, Press, LaneSwing, CrossSwing, Windmill, Roller } from '../generic.js';
import { composeEpisode, blocks, balls } from './compose.js';

// Episode 4: Food Fight. Golden sponge-cake decks on silver columns, swinging sausages,
// cucumber windmills, apples on candy-cane arches, cheese pushers, sandwich presses,
// rolling apples, burger balls and a lettuce finish pad.

const kitchen = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 66, t0: T },
    ...balls(69.65, 4, T + 0.35), // burger balls
    { x0: 89.6, x1: 100, t0: T },
  ],
  boosts: [{ x0: 28.8, x1: 30.6 }],
  coins: [
    { x: 3, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 24.5, h: 0.9 }, { x: 31.6, h: 0.45 }, { x: 45, h: 0.9 },
    { x: 57, h: 0.9 }, { x: 73.65, y: T + 2.4 }, { x: 84.25, y: T + 2.4 }, { x: 98, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new LaneSwing(m, { id: 'O1', x: at(6.5), top: T, look: 'sausage', period: 2.8, len: 2.4, pivotH: 5.2, amp: 0.7 }),
    new Windmill(m, { id: 'O2', x: at(20), top: T, look: 'cucumber', blades: 3, speed: 1.0 }),
    new CrossSwing(m, { id: 'O3', x: at(34.5), top: T, look: 'apple', pivotH: 6.15, len: 4.6, r: 0.75, period: 3.0 }),
    new Pusher(m, { id: 'O4', x: at(47.2), top: T, look: 'cheese', w: 1.3, period: 3.0 }),
    new Press(m, { id: 'O5', x: at(60.2), top: T, look: 'sandwich', period: 2.8 }),
    new Roller(m, { id: 'O6', x: at(95), top: T, look: 'apple', r: 0.5, period: 1.7 }),
  ],
});

const sausageAlley = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T },
    ...blocks(43.0, [T + 0.3, T + 0.7, T + 0.3]), // cheese blocks
    { x0: 57.8, x1: 70, t0: T },
    { x0: 72.2, x1: 84, t0: T, chev: true },
  ],
  coins: [
    { x: 2.5, h: 0.9 }, { x: 13.1, y: T + 1.6 }, { x: 24, h: 0.9 }, { x: 31, h: 0.9 }, { x: 49.2, y: T + 2.3 },
    { x: 60, h: 0.9 }, { x: 71.1, y: T + 1.6 }, { x: 82, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new LaneSwing(m, { id: 'O1', x: at(5.0), top: T, look: 'sausage', period: 2.8, len: 2.4, pivotH: 5.2, amp: 0.7 }),
    new LaneSwing(m, { id: 'O2', x: at(9.8), top: T, look: 'sausage', period: 2.8, len: 2.4, pivotH: 5.2, amp: 0.7, phase: -1.5 }), // wave with the first
    new Sweeper(m, { id: 'O3', x: at(20), top: T, speed: 2.0 }),
    new Pusher(m, { id: 'O4', x: at(32.6), top: T, look: 'cheese', w: 1.3, period: 2.8 }),
    new Pusher(m, { id: 'O5', x: at(36.6), top: T, look: 'cheese', w: 1.3, period: 2.8, phase: 1.4 }),
    new Windmill(m, { id: 'O6', x: at(63.8), top: T, look: 'cucumber', blades: 4, speed: 0.8 }),
    new CrossSwing(m, { id: 'O7', x: at(78), top: T, look: 'apple', pivotH: 6.15, len: 4.6, r: 0.75, period: 2.6, phase: 1 }),
  ],
});

const dessert = (T) => ({
  platforms: [
    { x0: 0, x1: 12, t0: T },
    { x0: 14.2, x1: 26, t0: T },
    { x0: 28.4, x1: 40, t0: T, chev: true },
    { x0: 42.4, x1: 52, t0: T },
    { x0: 54.4, x1: 66, t0: T },
    ...balls(69.65, 3, T + 0.35),
    { x0: 84.3, x1: 96, t0: T },
  ],
  boosts: [{ x0: 28.8, x1: 30.6 }],
  coins: [
    { x: 3, h: 0.9 }, { x: 17, h: 0.9 }, { x: 31.6, h: 0.45 }, { x: 41.2, y: T + 1.6 }, { x: 56, h: 0.9 },
    { x: 73.65, y: T + 2.4 }, { x: 86, h: 0.9 }, { x: 94, h: 0.9 },
  ],
  obstacles: (m, at) => [
    new Roller(m, { id: 'O1', x: at(6.5), top: T, look: 'apple', r: 0.5, period: 1.6 }),
    new Press(m, { id: 'O2', x: at(20), top: T, look: 'sandwich', period: 2.6, phase: 0.8 }),
    new Rotor(m, { id: 'O3', x: at(34.5), top: T, speed: 1.4 }),
    new LaneSwing(m, { id: 'O4', x: at(47.2), top: T, look: 'sausage', period: 2.8, len: 2.4, pivotH: 5.2, amp: 0.7 }),
    new Pusher(m, { id: 'O5', x: at(58), top: T, look: 'cheese', w: 1.3, period: 2.8 }),
    new Roller(m, { id: 'O6', x: at(62.6), top: T, look: 'apple', r: 0.5, period: 1.8, phase: 1.2 }),
    new Windmill(m, { id: 'O7', x: at(90.2), top: T, look: 'cucumber', blades: 3, speed: 1.2 }),
  ],
});

export const E4 = composeEpisode({
  id: 'E4', episode: 4,
  title: 'EPISODE 04', subtitle: 'Food Fight',
  theme: 'food', top: DECK_TOP, timeLimit: 200, stars: [56, 80],
  goals: ['stars3', 'slide5', 'nofall'],
}, [kitchen, sausageAlley, dessert]);
