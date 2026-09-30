# SHIV BABA: 2.5D Obstacle Course (Web + Android)

**▶ Play in the browser: https://heroone-lab.github.io/shiv-baba-game/**

Three.js side-on obstacle course game. One codebase runs in the browser and is wrapped as an Android app with Capacitor.

## Run / build
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production web build -> dist/
npx cap sync android   # copy dist/ into the Android project
cd android && ./gradlew assembleDebug   # APK -> android/app/build/outputs/apk/debug/
```
**Download the Android APK:** [apk/ShivBaba-v0.4.0-debug.apk](apk/ShivBaba-v0.4.0-debug.apk). Open it, tap "Download raw file", then install it on your phone (allow "Install unknown apps"). This is a debug build, not for the Play Store.

## Display settings (menu → SETTINGS, also from Pause)
| Resolution | Shadow map | Water reflection | Water shader | Post effects (bloom, grading, SMAA) | Pad clearcoat |
|---|---|---|---|---|---|
| Auto | follows 720p | | | | |
| 480p | 1024, every 2nd frame | 256 | cheap | off (tone mapping only) | off |
| 720p | 1024 | 512 | full | on | off |
| 1080p | 2048 | 1024 | full | on | on |

- **Auto** (default): dynamic resolution between 360p and 1080p that holds the chosen FPS. It drops quickly when frames are missed and rises slowly when there is headroom.
- **480p / 720p / 1080p**: fixed render height of the screen's short side, capped at native pixels.
- **Frame rate**: 30 / 48 / 60 FPS cap. Correct on 60, 90, 120 and 144 Hz screens.
- Gameplay does not depend on frame rate. The simulation runs in steps of ≤ 1/60 s, and jump height is identical at every FPS.
- **Show FPS**: `actual / target FPS · render height`. Green = on target, yellow/red = the device cannot keep up.
- **GPU line** in Settings shows which graphics chip the browser uses. If it is a software renderer (SwiftShader, "Microsoft Basic Render"), the game warns you to enable hardware acceleration.
- Performance work: static geometry merged (draw calls 246 → ~114). Lane floats, flags and vegetation are left out of the water reflection. Flags wave on the GPU.

URL options: `?res=auto|480|720|1080`, `?fps=30|48|60`, `?q=high|low`, `?nopost`, `?autostart`, `?round=E1R1|E2R1|E2R2|E2R3`.

## Controls
| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Run forward / back | D, Right / A, Left | arrow buttons | stick / d-pad |
| Jump (hold = higher) | Space, W, Up | JUMP | A |
| Slide | S, Down, Shift | SLIDE | B |
| Pause | P, Esc | pause button | Start |

## Episode 1 · Round 01 layout (IDs from the reference addendum)
| ID | Obstacle | Motion |
|---|---|---|
| O1 | Log with paddles | constant spin on a horizontal axle |
| O2 | Wide padded blocker | continuous yaw on a vertical pivot (can be jumped) |
| O3 | Wrecking ball | pendulum across the lane, smooth reversal |
| O4 | Small centre rotating bar | spins in a water gap; timed jump |
| — | Angled platform + low beam | static; slide under the beam |
| O5 | Log with paddles (faster) | as O1 |
| O6 | Tall gate arm | eased swing open/closed across the lane |
| O7 | Raised finish platform | static; jump up onto it |

Every obstacle was checked with a scripted bot. With good timing each one can be passed. Running through blind succeeds about 30–75% of the time.

## Episode 2 · Pirate Cove (3 rounds)
Every round starts on a tower with a chevron ramp. **Slide down the ramp** for extra speed.
- **Countdown timer**: finish before it runs out, or TIME'S UP / ELIMINATED. The stars above the timer drop as time passes.
- **Stars, coins, goals**: each round has 3-star/2-star times, coins to collect, and 2 goals, e.g. "Slide 5 times" or "Jump while sliding".
- **Speed boost** strips (glowing chevrons), slide-jump, bobbing big balls.
- **Your Opponent**: your own best run of that round races you as a ghost.
- **NEXT ROUND** on the result screen.

| Round | Time / 3★ / 2★ | Obstacles |
|---|---|---|
| 01 Pirate Cove | 60 s / 28 s / 42 s | skull crate, sweeper arm (jump), propeller rotor (slide), swinging barrel, iron roller gate (jump), stepping blocks, stamper (run under it when up, or jump it when down), ship-wheel spinner |
| 02 Cannon Deck | 60 s / 28 s / 42 s | rotor, 3 side cannons, boost + barrel, blade pendulum (slide), skull crate, sweeper, climbing blocks, rotor |
| 03 Big Balls | 80 s / 36 s / 52 s | iron roller, anchor pendulum, crate + sweeper combo, blocks, downhill slide ramp, vertical ship wheel, 4 big balls with a piston punching into the gap, rotor |

Level design rules, all checked by bot tests (`tools/tests/ep2_*.json`):
- A full-speed jump is about 5.3 m, so stepping blocks and balls are spaced for that.
- Boosts never throw you past the next deck.
- Every checkpoint is safe to stand on for 12 s.
- No visible pass-through at any obstacle.
- A blind bot finishes every round within the time limit.

## Code map
- `src/game.js`: flow (menu, intro flyover, countdown, play, result), render loop, post-processing
- `src/player/`: character wrapper (Mixamo clips, root motion removed) and the physics/state machine
- `src/world/`: environment (HDRI sky, pool water shader, terrain, trees, flags), data-driven course (`course.js`), round definitions (`courses.js`), obstacles (`obstacles.js` Episode 1, `pirate.js` Episode 2)
- `src/player/ghost.js`: records and replays your best run ("Your Opponent")
- `src/collision.js`: capsule collision against box, sphere and capsule shapes
- `tools/repack_glb.py`: shrinks the character GLB by re-encoding its textures only. Do not run gltf-transform `optimize` on the skinned character; it breaks the skinning.

## Assets
- Character: user-supplied Mixamo GLB (`public/models/hero*.glb`)
- Sky HDRI, wood/bark/grass textures, tree/shrub/rock models: [Poly Haven](https://polyhaven.com), CC0
- Water normal map: three.js examples (MIT)
