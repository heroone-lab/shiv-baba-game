import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodPost, steelPost, boxDeckGeometry, V } from './obstacles.js';
import { boxUV } from './materials.js';
import { logoTexture, chevronTexture, boostTexture, coinTexture, skullTexture, pirateFlagTexture } from './textures.js';
import { mergeStatic } from './merge.js';
import { sphere } from '../collision.js';

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
 *   ball    big skull ball on a pole: a curved, bobbing, slippery surface
 */
export class Course {
  constructor(scene, mats, def) {
    this.def = def;
    this.theme = def.theme || 'pool';
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
      o.standable = (x) => Math.abs(x - o.cx) < o.r * 0.85;
    } else {
      o.topAt = (x) => {
        const u = THREE.MathUtils.clamp((x - o.x0) / (o.x1 - o.x0), 0, 1);
        return o.t0 + (o.t1 - o.t0) * u;
      };
      o.standable = (x) => x >= o.x0 - 0.12 && x <= o.x1 + 0.12;
    }
    o.slope = kind === 'ball' ? 0 : (o.t1 - o.t0) / (o.x1 - o.x0);
    return o;
  }

  buildPlatform(mats, p) {
    const pirate = this.theme === 'pirate';
    switch (p.kind) {
      case 'block': return this.buildBlock(mats, p);
      case 'round': case 'nest': return this.buildRound(mats, p);
      case 'ball': return this.buildBall(mats, p);
      case 'tower': this.buildLattice(mats, p.x0, p.x1, p.t0 - p.thick, p.width); break;
      default: break;
    }
    const len = Math.hypot(p.x1 - p.x0, p.t1 - p.t0);
    const ang = Math.atan2(p.t1 - p.t0, p.x1 - p.x0);
    const width = p.width;
    const deck = new THREE.Group();
    deck.position.set((p.x0 + p.x1) / 2, (p.t0 + p.t1) / 2, 0);
    deck.rotation.z = ang;
    this.group.add(deck);

    const planks = new THREE.Mesh(boxDeckGeometry(len, p.thick, width), pirate ? mats.darkWood : mats.planks);
    planks.position.y = -p.thick / 2;
    planks.castShadow = planks.receiveShadow = true;
    deck.add(planks);

    // padded rims (pool look) or chunky timber edges (pirate look)
    const rimMat = pirate ? mats.bark : mats.padBlue;
    const rimGeo = pirate ? boxDeckGeometry(len + 0.02, 0.3, 0.24) : new RoundedBoxGeometry(len + 0.02, 0.34, 0.26, 3, 0.1);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(0, pirate ? -0.13 : -0.14, s * (width / 2 + 0.1));
      rim.castShadow = rim.receiveShadow = true;
      deck.add(rim);
    }
    const capGeo = pirate ? boxDeckGeometry(0.24, 0.34, width + 0.42) : new RoundedBoxGeometry(0.24, 0.36, width + 0.42, 3, 0.1);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, pirate ? mats.bark : mats.padTeal);
      cap.position.set(s * (len / 2 + 0.06), -0.17, 0);
      cap.castShadow = cap.receiveShadow = true;
      deck.add(cap);
    }
    if (p.chev || p.kind === 'ramp') {
      // painted chevrons (slide sections) as a decal just above the planks
      const tex = chevronTexture(p.kind === 'ramp' ? 'rgba(250,244,230,0.95)' : 'rgba(236,222,190,0.85)');
      tex.repeat.set(len / 1.1, 1);
      this.textures.push(tex);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(len, width - 0.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      decal.rotation.x = -Math.PI / 2; decal.position.y = 0.004; decal.receiveShadow = true;
      deck.add(decal);
    }
    if (p.kind === 'ramp') { this.buildLattice(mats, p.x0, p.x0 + (p.x1 - p.x0) * 0.55, null, width, p); return; }
    if (p.kind === 'tower') return;
    // timber supports down into the water with cross beams
    const n = Math.max(2, Math.round((p.x1 - p.x0) / 3.4) + 1);
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(p.x0 + 0.5, p.x1 - 0.5, i / (n - 1));
      const yTop = p.topAt(x) - p.thick;
      for (const z of [-(width / 2 - 0.25), width / 2 - 0.25]) this.group.add(woodPost(mats, x, z, -2.5, yTop, pirate ? 0.2 : 0.15));
      const cross = new THREE.Mesh(boxDeckGeometry(0.22, 0.26, width - 0.2), mats.woodPost);
      cross.position.set(x, yTop - 0.13, 0);
      cross.castShadow = true;
      this.group.add(cross);
      if (pirate) {
        // iron collars on the piles, like the reference
        for (const z of [-(width / 2 - 0.25), width / 2 - 0.25]) {
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 14), mats.darkSteel);
          collar.position.set(x, 0.15, z); collar.castShadow = true; this.group.add(collar);
        }
      }
    }
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
    const h = p.t0 + 0.6, w = p.x1 - p.x0;
    const crate = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, p.width), 0.45), mats.darkWood);
    crate.position.set((p.x0 + p.x1) / 2, p.t0 - h / 2, 0);
    crate.castShadow = crate.receiveShadow = true;
    this.group.add(crate);
    const trim = new THREE.Mesh(boxDeckGeometry(w + 0.06, 0.12, p.width + 0.06), mats.bark);
    trim.position.set((p.x0 + p.x1) / 2, p.t0 - 0.06, 0);
    trim.castShadow = true;
    this.group.add(trim);
    for (const y of [0.25, p.t0 * 0.55]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.1, p.width + 0.04), mats.darkSteel);
      band.position.set((p.x0 + p.x1) / 2, y, 0); this.group.add(band);
    }
  }

  buildRound(mats, p) {
    const r = (p.x1 - p.x0) / 2, cx = (p.x0 + p.x1) / 2;
    const disk = new THREE.Mesh(boxUV(new THREE.CylinderGeometry(r, r, p.thick, 40), 0.45), mats.darkWood);
    disk.position.set(cx, p.t0 - p.thick / 2, 0);
    disk.castShadow = disk.receiveShadow = true;
    this.group.add(disk);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 48), p.kind === 'nest' ? mats.brass : mats.darkSteel);
    ring.rotation.x = Math.PI / 2; ring.position.set(cx, p.t0 - 0.05, 0);
    this.group.add(ring);
    this.group.add(woodPost(mats, cx, 0, -2.5, p.t0 - p.thick, 0.45));
    for (const a of [0.8, 2.35, 3.9, 5.45]) this.group.add(woodPost(mats, cx + Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, -2.5, p.t0 - p.thick, 0.14));
    if (p.kind === 'nest') {
      // crow's nest: railing around the back half, mast and a skull flag
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
  }

  buildBall(mats, p) {
    const node = new THREE.Group();
    node.userData.dynamic = true;
    node.position.set(p.cx, p.centerY(), 0);
    this.group.add(node);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(p.r, 40, 28), mats.iron);
    ball.castShadow = ball.receiveShadow = true;
    node.add(ball);
    const sk = skullTexture('#16161a'); this.textures.push(sk);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(p.r + 0.004, 20, 16, Math.PI / 2 - 0.55, 1.1, Math.PI / 2 - 0.55, 1.1),
      new THREE.MeshStandardMaterial({ map: sk, roughness: 0.4, metalness: 0.6 }));
    node.add(cap);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.3, 16), mats.darkSteel);
    collar.position.y = -p.r - 0.05; node.add(collar);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 4, 14), mats.steelBright);
    pole.position.y = -p.r - 2.1; node.add(pole);
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
    const mat = pirate ? mats.darkWood : label === 'FINISH' ? mats.padRed : mats.padBlue;
    const h = top + 4.9 + 1;
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.5, h, 0.5, 3, 0.12), mat);
    post.position.set(x, -1 + h / 2, -2.3);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.4, 2.6, 3, 0.1), mat);
    arm.position.set(x, top + 4.6, -1.2);
    post.castShadow = arm.castShadow = true;
    g.add(post, arm);
    const bg = pirate ? (label === 'FINISH' ? ['#8a1408', '#2a0a04'] : ['#3a2414', '#1a0f08']) : label === 'FINISH' ? ['#d8321e', '#8a1408'] : ['#1c7fd6', '#0a3f7a'];
    const tex = logoTexture({ w: 1024, h: 256, bg, sub: label });
    this.textures.push(tex);
    const banner = new THREE.Mesh(new RoundedBoxGeometry(4.9, 1.2, 0.3, 3, 0.1), pirate ? mats.bark : mats.padWhite);
    banner.position.set(x, top + 4.55, 0);
    banner.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 }));
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
    for (const p of this.platforms) if (Math.abs(z) <= p.lane && p.standable(x)) return p;
    return null;
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
