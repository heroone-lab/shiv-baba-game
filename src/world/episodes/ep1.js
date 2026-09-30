import { DECK_TOP as T } from '../../config.js';
import { PaddleLog, VerticalBlocker, SwingingBall, GapSpinner, SwingGate, SlideBeam } from '../obstacles.js';

// Episode 1: the classic blue-and-red foam course over the pool (one continuous run).
export const E1 = {
  id: 'E1', episode: 1,
  title: 'EPISODE 01', subtitle: 'The Log Run',
  theme: 'pool', countdown: false, timeLimit: 150, stars: [45, 75],
  goals: ['nofall', 'stars3'],
  top: T,
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
