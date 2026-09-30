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
**Download the Android APKs** (debug builds, not for the Play Store). Open the link, tap "Download raw file", then allow "Install unknown apps":
- Phone / tablet: [apk/ShivBaba-v0.6.0-debug.apk](apk/ShivBaba-v0.6.0-debug.apk)
- **Android TV**: [apk/ShivBaba-TV-v0.6.0-debug.apk](apk/ShivBaba-TV-v0.6.0-debug.apk). Package `com.shivbaba.obstaclecourse.tv`, so it can sit next to the phone app. It shows up on the TV home screen with a banner. Install it with a USB stick and a file manager, or send it over with "Send Files to TV".

Build both: `npx vite build && npx cap sync android && sh tools/sync_tv.sh && (cd android && ./gradlew assembleDebug)`. Output goes to `android/app/build/outputs/apk/{phone,tv}/debug/`.

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

URL options: `?gfx=lite|full`, `?tv`, `?res=auto|480|720|1080`, `?fps=30|48|60`, `?q=high|low`, `?nopost`, `?autostart`, `?ep=E1…E6`, `?unlockall`.

## Graphics: Full / Lite (menu → SETTINGS → Graphics)
**Lite** uses the tricks 2014 mobile games used to look good on weak GPUs:
- diffuse (Lambert) shading instead of PBR and image-based light, with a hemisphere light for ambient
- a soft blob shadow under the runner instead of a shadow map
- pool water without the planar mirror (a sky-tint reflection instead)
- no post-processing

Colours, textures and neon stay the same. Measured in Episode 2 at 720p: Full = 148 draw calls and 736k triangles per frame; Lite (TV) = 49 draw calls and 344k triangles. In Episode 6: 115 / 1035k vs 46 / 460k.

## Android TV (TV APK)
- **TV mode** switches on automatically. The TV APK tags the WebView user agent with `ShivBabaTV`; other TV browsers are detected by user agent, and `?tv` forces it.
- Settings in TV mode: Lite graphics, low textures, little scenery, 30 FPS, auto resolution 360–720p (TV GPUs cannot drive 1080p 3D), overscan-safe margins, no touch buttons.
- Target hardware is the realme Smart TV class: MediaTek quad-core Cortex-A53, Mali-G52 GPU, 1–2 GB RAM, 1080p/4K panel.
- **Requirement: WebGL 2 (OpenGL ES 3.0).** The 32"/43" realme Smart TV with a **Mali-470 GPU is OpenGL ES 2.0 only**, so the game cannot run there, and it says so on screen. Mali-G52 models (realme 4K / X series) are fine. Keep "Android System WebView" updated from the Play Store.
- **Remote:** LEFT / RIGHT run, UP or OK jump (hold = higher), DOWN slide, BACK pause / go back / exit from the menu. In menus the D-pad moves a highlighted button and OK presses it. Gamepads work too.

## Controls
| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Run forward / back | D, Right / A, Left | arrow buttons | stick / d-pad |
| Jump (hold = higher) | Space, W, Up | JUMP | A |
| Slide | S, Down, Shift | SLIDE | B |
| Pause | P, Esc | pause button | Start |

TV remote: see *Android TV* above.

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
