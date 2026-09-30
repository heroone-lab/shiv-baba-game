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
**Download the Android APK:** [apk/ShivBaba-v0.5.0-debug.apk](apk/ShivBaba-v0.5.0-debug.apk). Open it, tap "Download raw file", then install it on your phone (allow "Install unknown apps"). This is a debug build, not for the Play Store.

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

URL options: `?res=auto|480|720|1080`, `?fps=30|48|60`, `?q=high|low`, `?nopost`, `?autostart`, `?ep=E1…E6`, `?unlockall`.

## Controls
| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Run forward / back | D, Right / A, Left | arrow buttons | stick / d-pad |
| Jump (hold = higher) | Space, W, Up | JUMP | A |
| Slide | S, Down, Shift | SLIDE | B |
| Pause | P, Esc | pause button | Start |

## Episodes
**Every episode is one continuous course, with no separate rounds.** The episodes unlock in order: finish an episode within its **qualify time** (the 2-star time) to open the next one. A locked card shows the time you need. `?unlockall` opens everything for testing.

| # | Episode | Look | Time limit / 3★ / 2★ = qualify | Obstacles |
|---|---|---|---|---|
| 01 | The Log Run | blue-and-red foam over the pool | 150 s / 45 s / 75 s | 7: paddle logs, spinning blocker, wrecking ball, gap spinner, low beam, swing gate |
| 02 | Pirate Cove | dark timber, skull flags, crow's-nest finish | 180 s / 63 s / 88 s | 23: skull crates, sweepers, rotors, barrel/anchor pendulums, iron rollers, stampers, ship wheels, side cannons, blade, big skull balls |
| 03 | Steel Works | riveted steel on black pipe legs, target finish | 150 s / 45 s / 62 s | 15: pan spinners, rainbow pistons, black claws, spiked maces, gold U-pipe rotors, steel windmill, stone balls |
| 04 | Food Fight | sponge cake on silver columns, lettuce finish | 200 s / 56 s / 80 s | 20: sausage swings, cucumber windmills, apples on candy canes, cheese pushers, sandwich presses, rolling apples, burger balls |
| 05 | Candy Land | pink pads, rainbow ramps, mushroom finish | 190 s / 53 s / 75 s | 18: jelly pushers and presses, peppermint pendulums, donut and cookie spinners, lollipop poles, pinwheels, revolving panels, mushroom balls |
| 06 | **Grand Finale** | **night**, neon, the whole course on pylons 6.6 m higher above the pool | 480 s / 160 s / 220 s | **50 different obstacles** in 5 zones (below) |

Episode 6 zones. Between the zones come stepping blocks, hydraulic lifts, vanishing glass panels (they disappear in a wave right behind you) and glowing orbs.
1. **Neon Launch**: Neon Paddle Log, Low Laser, Spinning Blocker, Wrecking Ball, High Laser, Gap Spinner, Neon Low Beam, Swing Gate, Flame Jets, Neon Sweeper
2. **Laser District**: Propeller Rotor, Laser Spinner, Swinging Barrel, Laser Grid, Iron Roller Gate, Tesla Gate, Piston Stamper, Patrol Drone, Wheel Spinner, Pop-up Bollards
3. **Fire Zone**: Plasma Cannon, Meteor Drop, Blade Pendulum, Saw Track, Skull Crate, Fire Hoop, Vertical Wheel, Anchor Pendulum, Inferno Vents, Wind Fan
4. **Machine Hall**: Neon Spin Bar, Neon Rotor Pipes, Neon Pusher, Ceiling Crusher, Neon Hammer, Plasma Orb, Neon Windmill, Rolling Reactor, Laser Axe, Trampoline Leap
5. **Final Gauntlet**: Meteor Shower, Pulse Laser, Twin Sweepers, Hyper Rotor, Twin Saws, Bollard Wave, Storm Gate, Turbine, Double Orbs, Ring of Fire

Every course has a countdown timer, stars, coins, goals, speed boosts, a tower slide, slide-jump, and "Your Opponent" (a ghost of your own best run).

### Bot tests (`tools/tests/eps_bot.js`, `eps_all.json`, `eps_pass.json`, `flow3.json`)
- Every checkpoint is safe to stand on for 12 s.
- Per obstacle, the test finds the best blind action (run, jump at a distance, or slide at a distance) with the runner arriving at full speed. A blind bot using those actions finishes every episode within its time limit.
- Obstacle-free best times: E2 47 s, E3 32 s, E4 41 s, E5 38 s, E6 115 s.
- No visible pass-through. The only collider overlaps are single frames while being knocked back.
- A full-speed jump is about 5.3 m. Blocks, balls and glass panels are spaced for it.

## Code map
- `src/game.js`: flow (menu, intro flyover, countdown, play, result), render loop, post-processing
- `src/player/`: character wrapper (Mixamo clips, root motion removed) and the physics/state machine
- `src/world/`: environment (HDRI sky or night sky, pool water shader, terrain, trees, flags, night skyline), data-driven course (`course.js`), themes (`themes.js`, `themeTextures.js`)
- `src/world/episodes/`: one file per episode; `compose.js` joins sections into one continuous course
- Obstacles: `obstacles.js` (Ep 1), `pirate.js` (Ep 2), `generic.js` (themed families for Ep 3-6), `night.js` (Ep 6 lasers, flames, tesla, meteors, drones, saws, wind, trampoline, fire hoops)
- `src/player/ghost.js`: records and replays your best run ("Your Opponent")
- `src/collision.js`: capsule collision against box, sphere and capsule shapes
- `tools/repack_glb.py`: shrinks the character GLB by re-encoding its textures only. Do not run gltf-transform `optimize` on the skinned character; it breaks the skinning.

## Assets
- Character: user-supplied Mixamo GLB (`public/models/hero*.glb`)
- Sky HDRI, wood/bark/grass textures, tree/shrub/rock models: [Poly Haven](https://polyhaven.com), CC0
- Water normal map: three.js examples (MIT)
