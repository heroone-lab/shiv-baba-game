import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DECK_TOP as T } from '../config.js';
import { PaddleLog, VerticalBlocker, SwingingBall, GapSpinner, SwingGate, SlideBeam, woodPost, boxDeckGeometry } from './obstacles.js';
import { logoTexture } from './textures.js';
import { mergeStatic } from './merge.js';

// ROUND 01 — wood / turquoise. Obstacle IDs O1–O7 match the reference addendum.
// Platforms are listed left→right; the runner travels +X along z = 0.
export const ROUND01 = {
  id: 'L01',
  title: 'ROUND 01',
  subtitle: 'The Log Run',
  platforms: [
    { x0: -6, x1: 12, t0: T, t1: T, kind: 'start' },
    { x0: 14.4, x1: 26.5, t0: T, t1: T },          // O1
    { x0: 29.0, x1: 40.5, t0: T, t1: T },          // O2
    { x0: 42.9, x1: 52.0, t0: T, t1: T },          // O3
    // water gap 52.0 → 55.4 with O4 spinning in it
    { x0: 55.4, x1: 61.0, t0: T, t1: T + 0.7 },    // angled platform (ramp up)
    { x0: 61.0, x1: 68.0, t0: T + 0.7, t1: T + 0.7 }, // slide beam
    { x0: 70.4, x1: 82.0, t0: T, t1: T },          // O5
    { x0: 84.4, x1: 95.0, t0: T, t1: T },          // O6
    { x0: 97.4, x1: 114, t0: T + 1.2, t1: T + 1.2, kind: 'finish' }, // O7 raised final platform
  ],
  finishX: 106,
  obstacles: (mats) => [
    new PaddleLog(mats, { id: 'O1', x: 20.5, top: T, arms: 2, speed: 1.25 }),
    new VerticalBlocker(mats, { id: 'O2', x: 34.8, top: T, speed: 1.0 }),
    new SwingingBall(mats, { id: 'O3', x: 47.4, top: T, period: 3.2 }),
    new GapSpinner(mats, { id: 'O4', x: 53.7, top: T, speed: 1.0, hubH: 0.4 }),
    new SlideBeam(mats, { id: 'SL', x: 64.6, top: T + 0.7 }),
    new PaddleLog(mats, { id: 'O5', x: 76.2, top: T, arms: 2, speed: 1.6, phase: 0.7, color: 'padOrange' }),
    new SwingGate(mats, { id: 'O6', x: 90.0, top: T, period: 3.4 }),
  ],
};

export class Course {
  constructor(scene, mats, def = ROUND01) {
    this.def = def;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.platforms = def.platforms.map((p) => ({
      ...p,
      zHalf: 1.2,
      thick: 0.38,
      topAt(x) {
        const u = THREE.MathUtils.clamp((x - this.x0) / (this.x1 - this.x0), 0, 1);
        return this.t0 + (this.t1 - this.t0) * u;
      },
    }));
    for (const p of this.platforms) this.buildPlatform(mats, p);
    this.obstacles = def.obstacles(mats);
    for (const o of this.obstacles) this.group.add(o.group);
    this.finishX = def.finishX;
    this.length = def.finishX;
    this.checkpoints = this.platforms
      .filter((p) => p.kind !== 'finish')
      .map((p) => ({ x: p.x0 + 1.4, y: p.topAt(p.x0 + 1.4) }));
    this.buildArch(mats, 1.5, T, 'START');
    this.buildArch(mats, this.finishX, T + 1.2, 'FINISH');
    // bake every non-moving mesh (decks, posts, rims, towers, arches) into a few draw calls
    const isDynamic = (o) => { for (let p = o; p && p !== this.group; p = p.parent) if (p.userData.dynamic) return true; return false; };
    this.mergeStats = mergeStatic(this.group, (o) => !isDynamic(o));
    this.time = 0;
  }

  buildPlatform(mats, p) {
    const len = Math.hypot(p.x1 - p.x0, p.t1 - p.t0);
    const ang = Math.atan2(p.t1 - p.t0, p.x1 - p.x0);
    const width = p.kind === 'finish' ? 3.4 : 2.3;
    const deck = new THREE.Group();
    deck.position.set((p.x0 + p.x1) / 2, (p.t0 + p.t1) / 2, 0);
    deck.rotation.z = ang;
    this.group.add(deck);

    const planks = new THREE.Mesh(boxDeckGeometry(len, p.thick, width), mats.planks);
    planks.position.y = -p.thick / 2;
    planks.castShadow = planks.receiveShadow = true;
    deck.add(planks);

    // blue padded rims along both long edges + teal end caps (course look from the reference)
    const rimGeo = new RoundedBoxGeometry(len + 0.02, 0.34, 0.26, 3, 0.1);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(rimGeo, mats.padBlue);
      rim.position.set(0, -0.14, s * (width / 2 + 0.1));
      rim.castShadow = rim.receiveShadow = true;
      deck.add(rim);
    }
    const capGeo = new RoundedBoxGeometry(0.24, 0.36, width + 0.42, 3, 0.1);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, mats.padTeal);
      cap.position.set(s * (len / 2 + 0.06), -0.17, 0);
      cap.castShadow = cap.receiveShadow = true;
      deck.add(cap);
    }

    // timber supports down into the water with cross beams
    const n = Math.max(2, Math.round((p.x1 - p.x0) / 3.4) + 1);
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(p.x0 + 0.5, p.x1 - 0.5, i / (n - 1));
      const yTop = p.topAt(x) - p.thick;
      for (const z of [-(width / 2 - 0.25), width / 2 - 0.25]) this.group.add(woodPost(mats, x, z, -2.5, yTop, 0.15));
      const cross = new THREE.Mesh(boxDeckGeometry(0.22, 0.26, width - 0.2), mats.woodPost);
      cross.position.set(x, yTop - 0.13, 0);
      cross.castShadow = true;
      this.group.add(cross);
    }
  }

  buildArch(mats, x, top, label) {
    // cantilever gantry: one post behind the deck so nothing blocks the side camera
    const g = new THREE.Group();
    const mat = label === 'FINISH' ? mats.padRed : mats.padBlue;
    const h = top + 4.9 + 1;
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.5, h, 0.5, 3, 0.12), mat);
    post.position.set(x, -1 + h / 2, -2.3);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.4, 2.6, 3, 0.1), mat);
    arm.position.set(x, top + 4.6, -1.2);
    post.castShadow = arm.castShadow = true;
    g.add(post, arm);
    const tex = logoTexture({ w: 1024, h: 256, bg: label === 'FINISH' ? ['#d8321e', '#8a1408'] : ['#1c7fd6', '#0a3f7a'], sub: label });
    const banner = new THREE.Mesh(new RoundedBoxGeometry(4.9, 1.2, 0.3, 3, 0.1), mats.padWhite);
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
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.3), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.7 }));
      strip.rotation.x = -Math.PI / 2; strip.position.set(x, top + 0.005, 0);
      strip.receiveShadow = true;
      g.add(strip);
    }
    this.group.add(g);
  }

  update(dt) {
    this.time += dt;
    for (const o of this.obstacles) {
      o.savePrev();
      o.update(this.time);
      o.group.updateMatrixWorld(true);
    }
  }

  /** platform whose footprint contains x (and z within the deck) */
  supportAt(x, z) {
    if (Math.abs(z) > 1.2) return null;
    for (const p of this.platforms) if (x >= p.x0 - 0.12 && x <= p.x1 + 0.12) return p;
    return null;
  }

  obstaclesNear(x, range = 7) { return this.obstacles.filter((o) => Math.abs(o.x - x) < range); }

  nextObstacleX(x) {
    let best = Infinity;
    for (const o of this.obstacles) if (o.x > x + 0.5 && o.x < best) best = o.x;
    if (this.finishX > x && this.finishX < best) best = this.finishX;
    return best;
  }

  checkpointFor(x) {
    let cp = this.checkpoints[0];
    for (const c of this.checkpoints) if (c.x <= x + 0.01) cp = c;
    return cp;
  }
}
