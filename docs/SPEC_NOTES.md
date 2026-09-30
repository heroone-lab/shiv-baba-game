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
