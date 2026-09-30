# SHIV BABA: 2.5D Obstacle Course (Web + Android)

Three.js side-on obstacle course game. One codebase runs in the browser and is wrapped as an Android app with Capacitor.

## Run / build
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production web build -> dist/
npx cap sync android   # copy dist/ into the Android project
cd android && ./gradlew assembleDebug   # APK -> android/app/build/outputs/apk/debug/
```
A pre-built debug APK is in `release/ShivBaba-debug.apk`.

URL options: `?q=high|low` (quality), `?nopost` (no post-processing), `?autostart`.

## Controls
| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Run forward / back | D, Right / A, Left | arrow buttons | stick / d-pad |
| Jump (hold = higher) | Space, W, Up | JUMP | A |
| Slide | S, Down, Shift | SLIDE | B |
| Pause | P, Esc | pause button | Start |

## Round 01 layout (IDs from the reference addendum)
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

## Code map
- `src/game.js`: flow (menu, intro flyover, countdown, play, result), render loop, post-processing
- `src/player/`: character wrapper (Mixamo clips, root motion removed) and the physics/state machine
- `src/world/`: environment (HDRI sky, pool water shader, terrain, trees, flags), course layout, obstacles
- `src/collision.js`: capsule collision against box, sphere and capsule shapes
- `tools/repack_glb.py`: shrinks the character GLB by re-encoding its textures only. Do not run gltf-transform `optimize` on the skinned character; it breaks the skinning.

## Assets
- Character: user-supplied Mixamo GLB (`public/models/hero*.glb`)
- Sky HDRI, wood/bark/grass textures, tree/shrub/rock models: [Poly Haven](https://polyhaven.com), CC0
- Water normal map: three.js examples (MIT)
