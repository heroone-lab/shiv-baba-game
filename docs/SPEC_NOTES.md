# Shiv Baba: Game Spec Notes

Built up from the reference documents as the user sends them. The reference material says "Wipeout"; the game uses "Shiv Baba" everywhere.

## Platform
- Web and Android from one codebase: Three.js (WebGL) + Vite, wrapped for Android with Capacitor.
- Camera: 2.5D side-on perspective follow with mild look-ahead toward the next obstacle.

## Main character (reference sheet #1)
- Realistic young Indian man with short, messy black hair and light stubble.
- Blue/grey plaid (checked) shirt, sleeves rolled to the elbow, worn over a white tee.
- Blue denim jeans.
- White sneakers with black/grey panels.
- Black wristwatch on the left wrist.
- Required animations: Idle, Walk, Run, Jump, Crouch/Slide, Reach, Climb, Fall, Push-up (get up), Victory.
- Target: low/medium poly, game-ready topology, 4K textures (downscaled on mobile).
- OPEN: the sheet is only an image. A rigged 3D model (.glb/.fbx) is still needed.

## Movement rules (PDF #1, p.3 and p.63)
| Type | Behaviour |
|---|---|
| Horizontal rotating | Spins around its long horizontal axle at constant angular velocity |
| Vertical rotating | Yaw around a vertical pivot; the face sweeps across the lane |
| Pendulum | Bounded arc around a fixed pivot, smooth reversal at each end |
| Lateral moving | Left/right between fixed limits, eased reversal |
| Rolling | Translates and spins, with roll direction matching travel |
| Rotating platform | Spins around a vertical axis and carries the player |
| Static/ramp/bridge | No motion |
| Water fall | Hit or missed jump: stumble, physical fall, splash, then retry/respawn |

- Player: run cycle with arm/leg counter-motion. Jump goes takeoff (knee flex), ascent, apex, descent, landing (knee compress).
- Slide: lower the collider and keep forward speed, then stand back up.
- Impact: brief stumble and loss of control, then a real fall into the water (no teleport).
- Water is the failure volume.
- Environment: wood + turquoise material family, water channel, platforms on posts, flags, background terrain, depth layers.
- UI: separate from the 3D world. Screens: loading, course/round title, timer, progress, contestant status, completion, failure/exhaustion, retry.

## Episode 1 rounds
### Round 01: wood/turquoise
| ID | Obstacle | Motion |
|---|---|---|
| O1 | Horizontal rotating log | Continuous spin |
| O2 | Vertical rotating blocker | Continuous yaw |
| O3 | Swinging ball/hammer | Pendulum from a top pivot |
| O4 | Small centre rotating blocker | Circular sweep through the gap |
| O5 | Horizontal rotating log | Same as O1 |
| O6 | Tall swinging/rotating arm | Gate-like sweep |
| O7 | Final raised platform | Static; player jumps up onto it |

Also: narrow platforms, water gaps, timed jumps, slide.

### Round 02: wood/turquoise
| ID | Obstacle | Motion |
|---|---|---|
| O1 | Large rotating wooden paddle/log | Rotating sweep |
| O2 | Short transition blocker | Bounded lateral sweep (not a full spin) |
| O3 | Narrow water-gap platform | Static; jump challenge |

Ends at a finish drum.

### Round 03: wood/turquoise
| ID | Obstacle | Motion |
|---|---|---|
| O1 | Vertical block | Static |
| O2 | Rotating horizontal bar | Circular sweep |
| O3 | Angled platform | Static slope |
| O4 | Moving blocker | Lateral with eased reversal |
| O5 | Final island | Static finish |

## Character file supplied (Google Drive GLB)
- The Mixamo "Ch49" model is a WWII soldier (helmet, olive uniform, boots). It is not the plaid-shirt Indian man from the reference sheet. It works in the game and can be swapped: replace `assets_src/character.glb` and rerun `tools/repack_glb.py`.
- 23 clips. There is no idle clip, so the game uses the first 0.9 s of "Defeated" (a relaxed stand) as a ping-pong loop.

## Known issues in the source PDF
- Frame sheets 1/58 to 58/58 are all identical: frames F1200 to F1320 (40.00s to 44.00s, the start of Round 01 O1). The frames for the rest of Round 01 and all of Rounds 02 and 03 are missing.
- The reference visuals are stylised/cartoon mobile-game art. The target look is realistic PBR, keeping the same layout and colour family.

---

# Episode 2: pirate cove (from `Wipeout2_Episode_02_Full_Detail.pdf`)
Source: 283 pages, 281 frames (402–962 s, one every 2 s). Frames 884–962 s are already **Episode 03 Round 01** (castle/knight theme on a metal deck), so they are not part of Episode 2.

## Look
- Same pool, grass and hills. Pirate props: skull crates and flags, a shark, anchors, ship wheels, cannons, a crow's-nest finish.
- Wooden zig-zag bridges. Chevron-painted planks mark slide/boost sections. Dark iron obstacles.
- The start is a tower with a chevron **slide ramp** down to the course (tip: "sliding downhill is an effective way to go faster").

## Round flow and HUD (seen on screen)
- SET! → GO!, then the timer **counts down** (~60 s). Three stars above the timer are lost as time passes.
- Coin counter (x/12, x/10). A "Your Opponent" ghost races along.
- After a fall: WIPEOUT splash, then "Get Ready!" and respawn.
- TIME'S UP! → ELIMINATED. On finish: COMPLETED! with stars, coins, "You won against your opponent".
- Secondary goals per round: "Slide 5 times in the same course", "Obtain 3 stars", "Jump while sliding", "Use the Speed Boost 3 times".
- (The shop, character roster, power-up purchases and leaderboards are menus of the original app. Not reproduced.)

## Obstacles
| Name | Frames | Motion |
|---|---|---|
| Sweeper (orange hub + low arm) | 434, 446, 456 | yaw at ankle height; jump it |
| Propeller rotor (4 arms on a post) | 450, 608 | yaw at head height; slide or time it |
| Swinging barrel | 458, 566 | pendulum across the lane |
| Iron pipe gate (black frame) | 462–472, 664 | rolls around the lane axis; low bar must be jumped |
| Stamper piston | 500, 742 | slams down from above, then rises |
| Ship-wheel spinner (horizontal) | 508, 526 | yaw with handles at waist height over a round deck |
| Side cannon | 562 | fires iron balls across the lane |
| Blade pendulum on arch | 570–588 | swings along the lane |
| Skull crate | 428, 598, 708, 842 | slides across the lane, pushes you off |
| Anchor pendulum (+ shark) | 692 | pendulum across the lane |
| Vertical ship wheel | 716–720, 848–852 | spokes rotate through the lane |
| Big balls (skull balls on poles) | 736–774, 866–872 | bobbing balls; hop ball to ball |
| Stepping blocks with gaps | 482–524, 700–706 | static; short jumps |
| Speed-boost strip (red arrows) | 716, 848 | static; speeds you up |

### Episode 2 tuning (bot-tested)
- Digital controls give no half-speed jumps, so gaps are sized for a full jump (~5.3 m flat). Stepping blocks are 2.4 m long on a 5.0 m pitch (4.8 m when climbing). Balls are 2.7 m wide on a 5.3 m pitch.
- Boost afterglow is 0.5 s, and carried speed bleeds at 14 m/s² on the ground. Boost strips never sit under a checkpoint.
- Ball landing counts on a curved top: ground snap is kept across sub-steps.
- Blade pendulum pivot is 5.1 m (slide under it). Vertical wheel: 2 handle pins at 1.0 rad/s.
- E2R3 piston between balls 2 and 3 punches down into the jump arc. Hop through while it is up.
- Extra checkpoint in E2R3 at x 77.1: past the vertical wheel, before the balls.
- Blind-bot pass rate per obstacle is 5–12/12 (the bot uses the best of run/jump/slide at fixed distances). Obstacle-free best times are E2R1 ≈ 16 s, E2R2 ≈ 16 s, E2R3 ≈ 19 s.
