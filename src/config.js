// Global tuning. All distances are metres, times seconds.
export const GAME_NAME = 'SHIV BABA';

export const PHYS = {
  gravity: 26,
  runSpeed: 7.2,
  groundAccel: 34,
  groundDecel: 30,
  airAccel: 14,
  jumpVel: 9.6,
  jumpCut: 0.55, // vy multiplier when jump released early (variable jump height)
  coyoteTime: 0.1,
  jumpBuffer: 0.14,
  slideTime: 0.8,
  slideFriction: 4,
  slideMinSpeed: 3.5,
  radius: 0.28,
  height: 1.76,
  slideHeight: 0.85,
  stepHeight: 0.32,
  maxFall: 30,
};

export const LANE_HALF = 1.1; // half-width of the walkable deck (z)
export const WATER_Y = 0;
export const DECK_TOP = 1.4;
export const ROUND_TIME_LIMIT = 150; // seconds, then "exhausted / time up"
export const RESPAWN_INVULN = 0; // no ghosting: checkpoints are placed outside every obstacle's sweep
