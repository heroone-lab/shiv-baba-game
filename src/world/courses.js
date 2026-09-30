import { E1 } from './episodes/ep1.js';
import { E2 } from './episodes/ep2.js';
import { E3 } from './episodes/ep3.js';
import { E4 } from './episodes/ep4.js';
import { E5 } from './episodes/ep5.js';
import { E6 } from './episodes/ep6.js';

// Every episode is ONE continuous course (no separate rounds).
// Episodes unlock in order: finish the previous episode within its qualifying
// time (`qualify`, seconds) to open the next one.
//   stars: [3-star time, 2-star time] in seconds of elapsed time
//   goals: secondary goals shown on the result screen (see GOALS in game.js)
export const EPISODES = [E1, E2, E3, E4, E5, E6];

for (const e of EPISODES) e.qualify ??= e.stars[1];

export const ROUNDS = Object.fromEntries(EPISODES.map((e) => [e.id, e]));
