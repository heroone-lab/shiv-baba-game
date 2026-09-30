import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodPost, steelPost, boxDeckGeometry, shadowed, V } from './obstacles.js';
import { boxUV } from './materials.js';
import { logoTexture, chevronTexture, boostTexture, coinTexture, skullTexture, pirateFlagTexture } from './textures.js';
import { mergeStatic } from './merge.js';
import { sphere } from '../collision.js';
import { skinMats, themeMaterials } from './themes.js';
import { glowTexture } from './themeTextures.js';

const PLAYER_R = 0.28;
const TAU = Math.PI * 2;

/**
 * A playable course built from a data definition (see courses.js).
 * Platform kinds:
 *   deck    plank bridge on posts (optionally sloped / chevron-painted)
 *   start   / finish  wide decks at the ends (Episode 1 look)
 *   tower   start tower on a steel lattice (Episode 2)
 *   ramp    chevron slide ramp down from the tower
 *   block   stepping crate standing in the water
 *   round   round deck (ship-wheel spinner)
 *   nest    crow's-nest finish platform
 *   ball    big ball on a pole: a curved, bobbing, slippery surface (skull / stone / burger / mushroom / orb)
 *   lift    deck on a piston that rises and sinks (amp, period, phase)
 *   blink   glass panel that vanishes for part of its cycle (period, on = fraction solid, phase)
 * Every theme (pool, pirate, steel, food, candy, night) dresses the same kinds differently.
 */
export class Course {
  constructor(scene, baseMats, def) {
    this.def = def;
    this.theme = def.theme || 'pool';
    const mats = skinMats(baseMats, this.theme);
    this.mats = mats;
    this.tm = themeMaterials(baseMats, this.theme);
    this.style = courseStyle(mats, this.tm, this.theme);
    this.movers = [];
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = 0;
    this.textures = [];
    this.platforms = def.platforms.map((p) => this.makePlatform(p));
    this.solids = [];
    for (const p of this.platforms) this.buildPlatform(mats, p);
    this.obstacles = def.obstacles(mats);
    for (const o of this.obstacles) this.group.add(o.group);
    this.decor = def.decor ? def.decor(mats) : [];
    for (const d of this.decor) this.group.add(d.group);
    this.finishX = def.finishX;
    this.length = def.finishX;
    this.checkpoints = this.platforms
      .filter((p) => p.cp !== false && ['start', 'deck', 'tower'].includes(p.kind) && p.t0 === p.t1)
      .map((p) => { const x = p.cpX ?? p.x0 + (p.kind === 'tower' ? 0.9 : 1.4); return { x, y: p.topAt(x) }; });
    // extra mid-deck checkpoints (e.g. just past an obstacle before a long, tricky section)
    for (const x of def.checkpoints || []) {
      const p = this.platforms.find((q) => x >= q.x0 && x <= q.x1);
      this.checkpoints.push({ x, y: p.topAt(x) });
    }
    this.checkpoints.sort((a, b) => a.x - b.x);
    this.boosts = (def.boosts || []).map((b) => ({ ...b }));
    for (const b of this.boosts) this.buildBoost(b);
    this.buildCoins(mats, def.coins || []);
    const first = this.platforms[0];
    if (first.kind === 'tower') this.buildArch(mats, first.x0 + 1.6, first.t0, 'START');
    else this.buildArch(mats, 1.5, first.t0, 'START');
    const fin = this.platforms.find((p) => p.kind === 'finish' || p.kind === 'nest');
    this.buildArch(mats, this.finishX, fin.t0, 'FINISH');
    // bake every non-moving mesh (decks, posts, rims, towers, arches) into a few draw calls
    const isDynamic = (o) => { for (let p = o; p && p !== this.group; p = p.parent) if (p.userData.dynamic) return true; return false; };
    this.mergeStats = mergeStatic(this.group, (o) => !isDynamic(o));
  }

  // ------------------------------------------------------------------ platforms
  makePlatform(p) {
    const kind = p.kind || 'deck';
    const course = this;
    const o = { ...p, kind };
    o.t1 ??= o.t0;
    const w = o.x1 - o.x0;
    const defaults = {
      deck: { half: 1.38, thick: 0.38, width: 2.3 },
      start: { half: 1.38, thick: 0.38, width: 2.3 },
      ramp: { half: 1.38, thick: 0.38, width: 2.3 },
      tower: { half: 1.6, thick: 0.4, width: 2.9 },
      finish: { half: 1.93, thick: 0.38, width: 3.4 },
      block: { half: 0.95, thick: o.t0 + 0.6, width: 1.9 },
      lift: { half: 1.2, thick: 0.4, width: 2.2 },
      blink: { half: 1.2, thick: 0.18, width: 2.2 },
      round: { half: Math.min(w / 2, 2.2), thick: 0.45, width: w },
      nest: { half: Math.min(w / 2, 2.2), thick: 0.5, width: w },
      ball: { half: 0, thick: 0, width: w },
    }[kind];
    o.half = p.half ?? defaults.half;
    o.thick = p.thick ?? defaults.thick;
    o.width = p.width ?? defaults.width;
    o.lane = Math.min(1.2, o.half || 1.2); // |z| the runner can stand at
    if (kind === 'ball') {
      o.cx = (o.x0 + o.x1) / 2;
      o.r = w / 2;
      o.bobA = p.bob ?? 0.22;
      o.bobP = p.bobPeriod ?? 2.4;
      o.bobPh = p.bobPhase ?? 0;
      o.centerY = () => o.t0 - o.r + o.bobA * Math.sin((TAU * course.time) / o.bobP + o.bobPh);
      // height of the capsule's feet when its bottom sphere rests on the ball
      o.topAt = (x) => {
        const dx = x - o.cx, R = o.r + PLAYER_R;
        return o.centerY() + Math.sqrt(Math.max(0, R * R - dx * dx)) - PLAYER_R;
      };
      o.standable = (x) => Math.abs(x - o.cx) < o.r * 0.95;
    } else {
      o.topAt = (x) => {
        const u = THREE.MathUtils.clamp((x - o.x0) / (o.x1 - o.x0), 0, 1);
        return o.t0 + (o.t1 - o.t0) * u;
      };
      o.standable = (x) => x >= o.x0 - 0.12 && x <= o.x1 + 0.12;
    }
    if (kind === 'lift') {
      const amp = p.amp ?? 0.9, per = p.period ?? 3.2, ph = p.phase ?? 0;
      o.dyn = true;
      o.offset = () => amp * Math.sin((TAU * course.time) / per + ph);
      o.topAt = (x) => o.t0 + o.offset();
    }
    if (kind === 'blink') {
      const per = p.period ?? 3.0, on = p.on ?? 0.62, ph = p.phase ?? 0;
      o.cycle = () => ((((course.time + ph) % per) + per) % per) / per;
      o.active = () => o.cycle() < on;
      o.warn = () => { const u = o.cycle(); return u > on - 0.22 && u < on; };
    }
    o.active ??= () => true;
    o.slope = kind === 'ball' ? 0 : (o.t1 - o.t0) / (o.x1 - o.x0);
    return o;
  }

  buildPlatform(mats, p) {
    const st = this.style;
    switch (p.kind) {
      case 'block': return this.buildBlock(mats, p);
      case 'round': case 'nest': return this.buildRound(mats, p);
      case 'ball': return this.buildBall(mats, p);
      case 'lift': return this.buildLift(mats, p);
      case 'blink': return this.buildBlink(mats, p);
      case 'tower': this.buildLattice(mats, p.x0, p.x1, p.t0 - p.thick, p.width); break;
      default: break;
    }
    const len = Math.hypot(p.x1 - p.x0, p.t1 - p.t0);
    const deck = this.deckMesh(mats, p, len);
    deck.position.set((p.x0 + p.x1) / 2, (p.t0 + p.t1) / 2, 0);
    deck.rotation.z = Math.atan2(p.t1 - p.t0, p.x1 - p.x0);
    this.group.add(deck);
    if (p.kind === 'ramp') { this.buildLattice(mats, p.x0, p.x0 + (p.x1 - p.x0) * 0.55, null, p.width, p); return; }
    if (p.kind === 'tower') return;
    this.buildSupports(mats, p, st);
  }

  /** slab + side rims + end caps (+ chevron decal), centred at the origin, sloped by the caller */
  deckMesh(mats, p, len) {
    const st = this.style, width = p.width;
    const deck = new THREE.Group();
    const planks = new THREE.Mesh(boxDeckGeometry(len, p.thick, width), st.deck);
    planks.position.y = -p.thick / 2;
    planks.castShadow = planks.receiveShadow = true;
    deck.add(planks);
    const rimGeo = st.rounded ? new RoundedBoxGeometry(len + 0.02, st.rimH, 0.26, 3, 0.1) : boxDeckGeometry(len + 0.02, st.rimH, 0.24);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(rimGeo, st.rim);
      rim.position.set(0, st.rimY, s * (width / 2 + 0.1));
      rim.castShadow = rim.receiveShadow = true;
      deck.add(rim);
    }
    const capGeo = st.rounded ? new RoundedBoxGeometry(0.24, 0.36, width + 0.42, 3, 0.1) : boxDeckGeometry(0.24, 0.34, width + 0.42);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, st.cap);
      cap.position.set(s * (len / 2 + 0.06), -0.17, 0);
      cap.castShadow = cap.receiveShadow = true;
      deck.add(cap);
    }
    if (p.chev || p.kind === 'ramp') {
      const tex = chevronTexture(st.chevron[p.kind === 'ramp' ? 0 : 1]);
      tex.repeat.set(len / 1.1, 1);
      this.textures.push(tex);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(len, width - 0.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, emissive: st.chevGlow ? 0xffffff : 0x000000, emissiveMap: st.chevGlow ? tex : null, emissiveIntensity: st.chevGlow ? 1.4 : 0 }));
      decal.rotation.x = -Math.PI / 2; decal.position.y = 0.004; decal.receiveShadow = true;
      deck.add(decal);
    }
    return deck;
  }

  /** posts from the water up to the deck: timber piles, steel pipes with feet, silver columns, neon pylons */
  buildSupports(mats, p, st) {
    const width = p.width;
    const n = Math.max(2, Math.round((p.x1 - p.x0) / st.postSpacing) + 1);
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(p.x0 + 0.5, p.x1 - 0.5, i / (n - 1));
      const yTop = p.topAt(x) - p.thick;
      const zs = st.centrePost ? [0] : [-(width / 2 - 0.25), width / 2 - 0.25];
      for (const z of zs) {
        if (st.post === 'wood') this.group.add(woodPost(mats, x, z, -2.5, yTop, st.postR));
        else {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(st.postR, st.postR, yTop + 2.5, 16), st.postMat);
          post.position.set(x, (yTop - 2.5) / 2, z); post.castShadow = true; this.group.add(post);
        }
        if (st.collar) {
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(st.postR + 0.07, st.postR + 0.07, 0.3, 16), st.collar);
          collar.position.set(x, 0.15, z); collar.castShadow = true; this.group.add(collar);
        }
        if (st.foot) { // bulbous pipe foot just above the waterline (Episode 3 look)
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(st.postR * 1.9, st.postR * 1.2, 0.8, 18), st.foot);
          foot.position.set(x, 0.5, z); foot.castShadow = true; this.group.add(foot);
        }
        if (st.rings) { // glowing rings up a tall pylon (night)
          for (let y = 1.5; y < yTop - 0.4; y += 2.2) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(st.postR + 0.03, 0.035, 6, 20), st.rings);
            ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); this.group.add(ring);
          }
        }
      }
      if (!st.centrePost) {
        const cross = new THREE.Mesh(boxDeckGeometry(0.22, 0.26, width - 0.2), st.crossMat);
        cross.position.set(x, yTop - 0.13, 0);
        cross.castShadow = true;
        this.group.add(cross);
      }
    }
  }

  buildLift(mats, p) {
    const node = new THREE.Group();
    node.userData.dynamic = true;
    const len = p.x1 - p.x0;
    const deck = this.deckMesh(mats, p, len);
    node.add(deck);
    // telescoping piston under the deck (moves with it; its foot stays hidden in the water)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, p.t0 + 3, 16), mats.steelBright);
    rod.position.y = -p.thick - (p.t0 + 3) / 2; node.add(rod);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 18), this.style.collar || mats.darkSteel);
    sleeve.position.y = -p.thick - 0.3; node.add(sleeve);
    if (this.tm.cyan || this.style.liftGlow) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.06, 0.06), this.style.liftGlow || this.tm.gold);
      for (const z of [-1, 1]) { const e = edge.clone(); e.position.set(0, -0.02, z * (p.width / 2 + 0.24)); node.add(e); }
    }
    node.position.set((p.x0 + p.x1) / 2, p.t0, 0);
    shadowed(node);
    this.group.add(node);
    this.movers.push(() => { node.position.y = p.topAt(0); });
  }

  buildBlink(mats, p) {
    const node = new THREE.Group();
    node.userData.dynamic = true;
    const len = p.x1 - p.x0;
    const glass = this.tm.glass || new THREE.MeshPhysicalMaterial({ color: 0x9adfff, roughness: 0.1, transparent: true, opacity: 0.6, clearcoat: 1 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len, p.thick, p.width), glass);
    slab.position.y = -p.thick / 2; node.add(slab);
    const frameMat = this.tm.cyan || mats.steelBright;
    for (const z of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.1, 0.1), frameMat);
      f.position.set(0, -0.05, z * (p.width / 2 + 0.05)); node.add(f);
    }
    for (const x of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, p.width + 0.2), frameMat);
      f.position.set(x * (len / 2 + 0.04), -0.05, 0); node.add(f);
    }
    node.position.set((p.x0 + p.x1) / 2, p.t0, 0);
    this.group.add(node);
    // thin hanger cables so it doesn't look like it floats on nothing
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 30, 4), mats.darkSteel);
    cable.position.set((p.x0 + p.x1) / 2, p.t0 + 15, -p.width / 2 - 0.1);
    this.group.add(cable);
    this.movers.push(() => {
      const on = p.active();
      node.visible = on && !(p.warn() && Math.floor(this.time * 12) % 2);
      node.scale.setScalar(on ? 1 : 0.001);
    });
  }

  /** steel lattice legs under the start tower / upper half of the slide ramp */
  buildLattice(mats, x0, x1, yTop, width, ramp = null) {
    const legs = ramp ? [x0 + 0.4, x1] : [x0 + 0.3, x1 - 0.3];
    for (const x of legs) {
      const top = yTop ?? ramp.topAt(x) - ramp.thick;
      for (const z of [-(width / 2 - 0.15), width / 2 - 0.15]) {
        const leg = steelPost(mats, x, z, -2.5, top, 0.09);
        this.group.add(leg);
      }
      for (let y = 0.6; y < top - 0.3; y += 1.1) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, width - 0.3), mats.steel);
        brace.position.set(x, y, 0); this.group.add(brace);
        const diag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), mats.steel);
        diag.position.set(x, y + 0.5, 0); diag.rotation.x = 0.9; this.group.add(diag);
      }
    }
  }

  buildBlock(mats, p) {
    const st = this.style, cx = (p.x0 + p.x1) / 2;
    const h = p.t0 + 0.6, w = p.x1 - p.x0;
    const crate = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, p.width), 0.45), st.block);
    crate.position.set(cx, p.t0 - h / 2, 0);
    crate.castShadow = crate.receiveShadow = true;
    this.group.add(crate);
    const trim = new THREE.Mesh(boxDeckGeometry(w + 0.06, 0.12, p.width + 0.06), st.blockTrim);
    trim.position.set(cx, p.t0 - 0.06, 0);
    trim.castShadow = true;
    this.group.add(trim);
    for (const y of [0.25, p.t0 * 0.55]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.1, p.width + 0.04), st.blockBand);
      band.position.set(cx, y, 0); this.group.add(band);
    }
  }

  buildRound(mats, p) {
    const st = this.style;
    const r = (p.x1 - p.x0) / 2, cx = (p.x0 + p.x1) / 2;
    const nest = p.kind === 'nest';
    const topMat = nest ? st.finishTop : st.roundTop;
    const disk = new THREE.Mesh(boxUV(new THREE.CylinderGeometry(r, r * (nest && st.finishTaper ? 0.92 : 1), p.thick, 48), 0.45), [st.roundSide, topMat, st.roundSide]);
    disk.position.set(cx, p.t0 - p.thick / 2, 0);
    disk.castShadow = disk.receiveShadow = true;
    this.group.add(disk);
    if (nest && st.targetRings) { // bullseye finish pad
      [[r * 0.82, st.targetRings[0]], [r * 0.58, st.targetRings[1]], [r * 0.34, st.targetRings[0]], [r * 0.14, st.targetRings[1]]].forEach(([rr, m], i) => {
        const ring = new THREE.Mesh(new THREE.CircleGeometry(rr, 48), m);
        ring.rotation.x = -Math.PI / 2; ring.position.set(cx, p.t0 + 0.003 + i * 0.001, 0); ring.receiveShadow = true;
        this.group.add(ring);
      });
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 48), nest ? st.finishRing : st.collar || mats.darkSteel);
    ring.rotation.x = Math.PI / 2; ring.position.set(cx, p.t0 - 0.05, 0);
    this.group.add(ring);
    const stemH = p.t0 - p.thick + 2.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(st.post === 'wood' ? 0.45 : r * 0.35, st.post === 'wood' ? 0.5 : r * 0.42, stemH, 24), st.post === 'wood' ? mats.bark : st.roundStem);
    stem.position.set(cx, p.t0 - p.thick - stemH / 2, 0); stem.castShadow = true;
    this.group.add(stem);
    if (st.post === 'wood') for (const a of [0.8, 2.35, 3.9, 5.45]) this.group.add(woodPost(mats, cx + Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, -2.5, p.t0 - p.thick, 0.14));
    if (nest && this.theme === 'pirate') this.buildCrowsNest(mats, p, cx, r);
    if (nest && this.theme === 'night') {
      const glow = new THREE.Mesh(new THREE.TorusGeometry(r + 0.05, 0.08, 8, 64), this.tm.gold);
      glow.rotation.x = Math.PI / 2; glow.position.set(cx, p.t0 + 0.02, 0); this.group.add(glow);
    }
  }

  buildCrowsNest(mats, p, cx, r) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(r - 0.1, 0.06, 8, 40, Math.PI), mats.darkWood);
    rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI; rail.position.set(cx, p.t0 + 0.95, 0);
    this.group.add(rail);
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8), mats.darkWood);
      post.position.set(cx + Math.cos(a) * (r - 0.1), p.t0 + 0.47, Math.sin(a) * (r - 0.1));
      this.group.add(post);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 12), mats.darkWood);
    mast.position.set(cx + 0.6, p.t0 + 3, -r + 0.2); mast.castShadow = true;
    this.group.add(mast);
    const ft = pirateFlagTexture(); this.textures.push(ft);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: 0.85 }));
    flag.position.set(cx + 1.55, p.t0 + 5.4, -r + 0.2);
    this.group.add(flag);
    const sk = skullTexture('#2a1d14'); this.textures.push(sk);
    const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ map: sk, roughness: 0.6 }));
    plaque.position.set(cx, p.t0 - p.thick * 0.5, r + 0.01);
    this.group.add(plaque);
  }

  buildBall(mats, p) {
    const st = this.style;
    const node = new THREE.Group();
    node.userData.dynamic = true;
    node.position.set(p.cx, p.centerY(), 0);
    this.group.add(node);
    const look = p.look || st.ball;
    if (look === 'burger') {
      // stacked burger: domed bun, lettuce, patty, cheese, bottom bun (all inside the collision sphere)
      const t = this.tm;
      const top = new THREE.Mesh(new THREE.SphereGeometry(p.r, 40, 20, 0, TAU, 0, Math.PI / 2), t.bun); top.scale.y = 0.85; top.position.y = -0.05; node.add(top);
      const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 1.0, p.r * 0.98, 0.14, 32), t.lettuce); lettuce.position.y = -0.14; node.add(lettuce);
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(p.r * 1.5, 0.06, p.r * 1.5), t.cheese); cheese.position.y = -0.24; cheese.rotation.y = 0.5; node.add(cheese);
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.97, p.r * 0.97, 0.3, 32), t.patty); patty.position.y = -0.42; node.add(patty);
      const bot = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.96, 40, 12, 0, TAU, Math.PI / 2, Math.PI / 2), t.bun); bot.scale.y = 0.55; bot.position.y = -0.58; node.add(bot);
    } else {
      const matFor = { skull: mats.iron, stone: this.tm.stone, mushroom: this.tm.mushroom, orb: this.tm.padPink, mint: this.tm.mint }[look] || mats.iron;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(p.r, 40, 28), matFor);
      if (look === 'mushroom') { ball.scale.y = 0.82; ball.position.y = 0.08 * p.r; }
      node.add(ball);
      if (look === 'skull') {
        const sk = skullTexture('#16161a'); this.textures.push(sk);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(p.r + 0.004, 20, 16, Math.PI / 2 - 0.55, 1.1, Math.PI / 2 - 0.55, 1.1),
          new THREE.MeshStandardMaterial({ map: sk, roughness: 0.4, metalness: 0.6 }));
        node.add(cap);
      }
      if (look === 'orb') {
        const band = new THREE.Mesh(new THREE.TorusGeometry(p.r * 1.0, 0.06, 8, 48), this.tm.cyan);
        band.rotation.x = Math.PI / 2; node.add(band);
      }
    }
    node.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.3, 16), st.ballCollar);
    collar.position.y = -p.r - 0.05; node.add(collar);
    const poleLen = p.t0 + 3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, poleLen, 14), st.ballPole);
    pole.position.y = -p.r - poleLen / 2; node.add(pole);
    const col = sphere(node, V(0, 0, 0), p.r);
    col.node.userData.prev = new THREE.Matrix4();
    p.node = node;
    this.solids.push({ x: p.cx, colliders: [col], platform: p });
  }

  buildBoost(b) {
    const d = this.supportAt(b.x0 + 0.1, 0) || this.platforms[0];
    const len = b.x1 - b.x0;
    const tex = boostTexture(); this.textures.push(tex);
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -3 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.5), mat);
    const xm = (b.x0 + b.x1) / 2;
    m.position.set(xm, d.topAt(xm) + 0.008, 0);
    m.rotation.set(-Math.PI / 2, 0, 0);
    m.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.atan(d.slope || 0));
    m.userData.dynamic = true; // keep its own material (animated glow)
    this.group.add(m);
    b.mat = mat;
  }

  buildCoins(mats, list) {
    this.coins = list.map((c) => {
      const d = this.supportAt(c.x, 0);
      const base = d ? d.topAt(c.x) : 1.4;
      return { x: c.x, y: c.y ?? base + (c.h ?? 1.0), taken: false };
    });
    this.coinTotal = this.coins.length;
    if (!this.coins.length) return;
    const tex = coinTexture(); this.textures.push(tex);
    const face = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.9, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.4 });
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28);
    geo.rotateX(Math.PI / 2);
    const inst = new THREE.InstancedMesh(geo, [mats.gold, face, face], this.coins.length);
    inst.castShadow = true;
    inst.frustumCulled = false;
    inst.userData.dynamic = true;
    this.group.add(inst);
    this.coinMesh = inst;
    this.updateCoins();
  }

  updateCoins() {
    if (!this.coinMesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.coins.forEach((c, i) => {
      q.setFromAxisAngle(up, this.time * 3 + i);
      p.set(c.x, c.y + Math.sin(this.time * 2.5 + i) * 0.06, 0);
      s.setScalar(c.taken ? 0 : 1);
      this.coinMesh.setMatrixAt(i, m.compose(p, q, s));
    });
    this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  /** collect coins touching the runner's capsule; returns how many were picked up */
  collectCoins(pos, height) {
    let n = 0;
    for (const c of this.coins) {
      if (c.taken || Math.abs(c.x - pos.x) > 0.7 || Math.abs(pos.z) > 0.8) continue;
      if (c.y > pos.y - 0.3 && c.y < pos.y + height + 0.35) { c.taken = true; n++; this.lastCoin = c; }
    }
    return n;
  }

  resetCoins() { for (const c of this.coins) c.taken = false; }

  buildArch(mats, x, top, label) {
    // cantilever gantry: one post behind the deck so nothing blocks the side camera
    const g = new THREE.Group();
    const pirate = this.theme === 'pirate';
    const st = this.style;
    const mat = label === 'FINISH' ? st.archFinish : st.archStart;
    const h = top + 4.9 + 1;
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.5, h, 0.5, 3, 0.12), mat);
    post.position.set(x, -1 + h / 2, -2.3);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.4, 2.6, 3, 0.1), mat);
    arm.position.set(x, top + 4.6, -1.2);
    post.castShadow = arm.castShadow = true;
    g.add(post, arm);
    const bg = label === 'FINISH' ? st.bannerFinish : st.bannerStart;
    const tex = logoTexture({ w: 1024, h: 256, bg, sub: label });
    this.textures.push(tex);
    const banner = new THREE.Mesh(new RoundedBoxGeometry(4.9, 1.2, 0.3, 3, 0.1), pirate ? mats.bark : st.bannerFrame);
    banner.position.set(x, top + 4.55, 0);
    banner.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: this.theme === 'night' ? 1.2 : 0.15 }));
    face.position.set(x, top + 4.55, 0.16);
    g.add(banner, face);
    if (label === 'FINISH') {
      // chequered finish strip on the deck
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const cx = c.getContext('2d');
      for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) { cx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; cx.fillRect(i * 32, j * 32, 32, 32); }
      const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(ct);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.3), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
      strip.rotation.x = -Math.PI / 2; strip.position.set(x, top + 0.006, 0);
      strip.receiveShadow = true;
      g.add(strip);
    }
    this.group.add(g);
  }

  // ------------------------------------------------------------------ runtime
  update(dt) {
    this.time += dt;
    for (const o of this.obstacles) {
      o.savePrev();
      o.update(this.time);
      o.group.updateMatrixWorld(true);
    }
    for (const f of this.movers) f();
    for (const s of this.solids) {
      const n = s.colliders[0].node;
      n.userData.prev.copy(n.matrixWorld);
      n.position.y = s.platform.centerY();
      n.updateMatrixWorld(true);
    }
  }

  /** per rendered frame: coin spin, boost glow, scenery */
  visuals() {
    this.updateCoins();
    for (const b of this.boosts) b.mat.emissiveIntensity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 6));
    for (const d of this.decor) d.update?.(this.time);
  }

  /** platform whose footprint contains x (and z within the lane) */
  supportAt(x, z) {
    for (const p of this.platforms) if (Math.abs(z) <= p.lane && p.standable(x) && p.active()) return p;
    return null;
  }

  windAt(x) {
    let w = 0;
    for (const o of this.obstacles) if (o.windAt && Math.abs(o.x - x) < 12) w += o.windAt(x, this.time);
    return w;
  }

  boostAt(x) { return this.boosts.find((b) => x >= b.x0 && x <= b.x1) || null; }

  obstaclesNear(x, range = 7) { return this.obstacles.filter((o) => Math.abs(o.x - x) < range); }

  solidsNear(x, range = 4) { return this.solids.filter((s) => Math.abs(s.x - x) < range); }

  nextObstacleX(x) {
    let best = Infinity;
    for (const o of this.obstacles) if (o.x > x + 0.5 && o.x < best) best = o.x;
    for (const s of this.solids) if (s.x > x + 0.5 && s.x < best) best = s.x;
    if (this.finishX > x && this.finishX < best) best = this.finishX;
    return best;
  }

  checkpointFor(x) {
    let cp = this.checkpoints[0];
    for (const c of this.checkpoints) if (c.x <= x + 0.01) cp = c;
    return cp;
  }

  dispose() {
    this.scene.remove(this.group);
    const mats = new Set();
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
      if (o.material) for (const m of [].concat(o.material)) if (m.map && this.textures.includes(m.map)) mats.add(m);
    });
    for (const m of mats) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

/** How each theme dresses decks, posts, blocks, balls, finish pads and arches. */
function courseStyle(mats, t, theme) {
  const base = {
    deck: mats.planks, rim: mats.padBlue, cap: mats.padTeal, rounded: true, rimH: 0.34, rimY: -0.14,
    post: 'wood', postR: 0.15, postMat: mats.steel, postSpacing: 3.4, collar: null, foot: null, rings: null, centrePost: false, crossMat: mats.woodPost,
    chevron: ['rgba(250,244,230,0.95)', 'rgba(236,222,190,0.85)'], chevGlow: false,
    block: mats.darkWood, blockTrim: mats.bark, blockBand: mats.darkSteel,
    roundTop: mats.darkWood, roundSide: mats.darkWood, roundStem: mats.steel, finishTop: mats.darkWood, finishRing: mats.brass, finishTaper: false, targetRings: null,
    ball: 'skull', ballPole: mats.steelBright, ballCollar: mats.darkSteel,
    archStart: mats.padBlue, archFinish: mats.padRed, bannerFrame: mats.padWhite,
    bannerStart: ['#1c7fd6', '#0a3f7a'], bannerFinish: ['#d8321e', '#8a1408'],
  };
  if (theme === 'pirate') Object.assign(base, {
    deck: mats.darkWood, rim: mats.bark, cap: mats.bark, rounded: false, rimH: 0.3, rimY: -0.13, postR: 0.2, collar: mats.darkSteel,
    archStart: mats.darkWood, archFinish: mats.darkWood, bannerStart: ['#3a2414', '#1a0f08'], bannerFinish: ['#8a1408', '#2a0a04'],
  });
  if (theme === 'steel') Object.assign(base, {
    deck: t.deck, rim: t.gunmetal, cap: t.blackSteel, rimH: 0.42, rimY: -0.1, post: 'steel', postMat: t.blackSteel, postR: 0.22, postSpacing: 4.2,
    foot: t.blackSteel, centrePost: true, crossMat: t.blackSteel, chevron: ['rgba(240,122,18,0.95)', 'rgba(240,122,18,0.8)'],
    block: t.gunmetal, blockTrim: t.blackSteel, blockBand: t.hazard, roundTop: t.deck, roundSide: t.gunmetal, roundStem: t.blackSteel,
    finishTop: mats.padWhite, finishRing: t.blackSteel, targetRings: [mats.padRed, mats.padWhite], ball: 'stone', ballPole: t.yellowPole, ballCollar: t.blackSteel,
    archStart: t.gunmetal, archFinish: t.blackSteel, bannerFrame: mats.steelBright, bannerStart: ['#5a6068', '#2a2e34'], bannerFinish: ['#f07a12', '#8a3a00'],
  });
  if (theme === 'food') Object.assign(base, {
    deck: t.deck, rim: t.crust, cap: t.crust, rimH: 0.36, post: 'steel', postMat: mats.steelBright, postR: 0.24, postSpacing: 4.6, collar: mats.steel, centrePost: true,
    crossMat: mats.steel, chevron: ['rgba(255,250,235,0.95)', 'rgba(255,248,225,0.9)'],
    block: t.cheese, blockTrim: t.crust, blockBand: t.crust, roundTop: t.lettuce, roundSide: t.pickle, roundStem: mats.steelBright,
    finishTop: t.lettuce, finishRing: t.pickle, finishTaper: true, ball: 'burger', ballPole: mats.steelBright, ballCollar: t.crust,
    archStart: t.cane, archFinish: t.cane, bannerFrame: t.bread, bannerStart: ['#e8b646', '#a8702e'], bannerFinish: ['#c8141a', '#6a0a0c'],
  });
  if (theme === 'candy') Object.assign(base, {
    deck: t.deck, rim: t.deckDark, cap: t.pinkWhite, rimH: 0.38, post: 'steel', postMat: mats.steelBright, postR: 0.24, postSpacing: 4.4, collar: t.deckDark, centrePost: true,
    crossMat: mats.steel, chevron: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)'],
    block: t.jelly, blockTrim: t.deckDark, blockBand: t.pinkWhite, roundTop: t.cookie, roundSide: t.deckDark, roundStem: t.stalk,
    finishTop: t.mushroom, finishRing: t.pinkWhite, finishTaper: true, ball: 'mushroom', ballPole: t.lolly, ballCollar: t.stalk,
    archStart: t.lolly, archFinish: t.lolly, bannerFrame: t.pinkWhite, bannerStart: ['#ff6ab0', '#b8327a'], bannerFinish: ['#8a4ce8', '#4a1a8a'],
  });
  if (theme === 'night') Object.assign(base, {
    deck: t.deck, rim: t.cyan, cap: t.pink, rounded: false, rimH: 0.14, rimY: -0.06, post: 'steel', postMat: t.carbon, postR: 0.2, postSpacing: 4.4, collar: t.carbon,
    rings: t.cyan, centrePost: true, crossMat: t.carbon, chevron: ['rgba(255,60,200,0.95)', 'rgba(40,232,255,0.9)'], chevGlow: true,
    block: t.carbon, blockTrim: t.pink, blockBand: t.cyan, roundTop: t.deck, roundSide: t.carbon, roundStem: t.carbon,
    finishTop: t.deck, finishRing: t.gold, targetRings: [t.padPink, t.padWhiteGlow], ball: 'orb', ballPole: t.carbon, ballCollar: t.cyan,
    archStart: t.carbon, archFinish: t.carbon, bannerFrame: t.carbon, bannerStart: ['#07203a', '#02060e'], bannerFinish: ['#3a0730', '#0e0210'],
    liftGlow: t.gold,
  });
  return base;
}
