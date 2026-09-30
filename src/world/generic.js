import * as THREE from 'three';
import { Obstacle, V, pad, shadowed, steelPost, woodPost } from './obstacles.js';
import { box, sphere, capsule } from '../collision.js';

// Parametric obstacle families used by Episodes 3-6. Each family has one motion
// and collision model; `look` picks the themed mesh (pan, sausage, jelly, neon...).
// Materials come from the episode's skinned material set: mats.t = theme extras.

const TAU = Math.PI * 2;
const smooth = (u) => u * u * (3 - 2 * u);
const cyc = (t, per, ph = 0) => ((((t + ph) % per) + per) % per) / per;

function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
const tMat = (mats, name, fallback) => mats.t?.[name] || mats[fallback] || mats.steel;

// ------------------------------------------------------------------ SpinBar
/**
 * Arms turning around a vertical axis from a hub behind the lane.
 * h < 0.9: knee height, jump them.  h > 1.2: head height, slide under.
 * looks: pan (gold pole + frying-pan hub), upipe (gold U pipes), donut, neon, cookie.
 */
export class SpinBar extends Obstacle {
  constructor(mats, { id, x, top, h = 0.6, len = 3.0, hubZ = -1.7, speed = 1.3, arms = 2, look = 'pan', phase = 0 }) {
    super(id, 'Spin bar (' + look + ')', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const hy = top + h;
    const postMat = look === 'neon' ? tMat(mats, 'carbon', 'darkSteel') : mats.darkSteel;
    g.add(steelPost(mats, x, hubZ, top - 0.05, hy + 0.1, 0.18)).children;
    g.children[g.children.length - 1].material = postMat;
    const rot = new THREE.Group(); rot.position.set(x, hy, hubZ); g.add(rot); this.rot = rot;
    const gold = tMat(mats, 'gold', 'brass');
    const barMat = { pan: mats.brass, upipe: mats.brass, donut: mats.steelBright, neon: tMat(mats, 'cyan', 'steel'), cookie: mats.steelBright }[look] || mats.steel;
    // hub
    if (look === 'pan') {
      const pan = mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.2, 28), mats.iron); rot.add(pan);
      const rim = mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 28), mats.darkSteel); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; rot.add(rim);
    } else if (look === 'cookie' || look === 'donut') {
      const disk = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.26, 32), tMat(mats, 'cookie', 'brass')); rot.add(disk);
    } else {
      rot.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.34, 20), look === 'neon' ? tMat(mats, 'pink', 'brass') : gold));
    }
    for (let k = 0; k < arms; k++) {
      const arm = new THREE.Group(); arm.rotation.y = (k / arms) * TAU; rot.add(arm);
      const r = look === 'upipe' ? 0.13 : look === 'neon' ? 0.09 : 0.1;
      const tube = mesh(new THREE.CylinderGeometry(r, r, len - 0.5, 14), barMat, 0, 0, 0.5 + (len - 0.5) / 2);
      tube.rotation.x = Math.PI / 2; arm.add(tube);
      if (look === 'upipe') { // U-bend at the tip
        const bend = mesh(new THREE.TorusGeometry(0.3, r, 10, 16, Math.PI), barMat, 0, -0.3, len); bend.rotation.y = Math.PI / 2; bend.rotation.z = Math.PI / 2; arm.add(bend);
      }
      if (look === 'donut') for (const z of [1.3, 2.1, 2.8]) {
        const d = mesh(new THREE.TorusGeometry(0.2, 0.11, 10, 20), [tMat(mats, 'lolly', 'padRed'), tMat(mats, 'grape', 'padBlue'), mats.padYellow][Math.round(z) % 3], 0, 0, z);
        arm.add(d);
      }
      arm.add(mesh(new THREE.SphereGeometry(r * 1.5, 12, 8), look === 'neon' ? tMat(mats, 'pink', 'brass') : gold, 0, 0, len));
      this.collide(capsule(arm, V(0, 0, 0.6), V(0, 0, len), look === 'donut' ? 0.3 : 0.15));
      if (look === 'upipe') this.collide(capsule(arm, V(0, -0.05, len), V(0, -0.62, len), 0.16)); // the U-bend hangs below the tip
    }
    shadowed(g); this.finish();
  }
  update(t) { this.rot.rotation.y = this.speed * t + this.phase; }
}

// ------------------------------------------------------------------ Pusher
/** Block or piston that shoots out across the lane from behind and pulls back. */
export class Pusher extends Obstacle {
  constructor(mats, { id, x, top, period = 2.6, phase = 0, look = 'piston', w = 1.2, h = 1.9, outZ = 0.35 }) {
    super(id, 'Pusher (' + look + ')', x);
    this.period = period; this.phase = phase;
    this.parkZ = -2.5; this.outZ = outZ;
    const g = this.group;
    const mover = new THREE.Group(); mover.position.set(x, top + 0.04, this.parkZ); g.add(mover); this.mover = mover;
    if (look === 'piston') {
      // round steel ram with a rainbow face (Episode 3 reference)
      const body = mesh(new THREE.CylinderGeometry(h / 2, h / 2, w * 2, 28), tMat(mats, 'gunmetal', 'steel'), 0, h / 2, -w * 0.5); body.rotation.x = Math.PI / 2; mover.add(body);
      const face = mesh(new THREE.CircleGeometry(h / 2 - 0.02, 28), tMat(mats, 'rainbow', 'padRed'), 0, h / 2, w * 0.5 + 0.005); mover.add(face);
      const rim = mesh(new THREE.TorusGeometry(h / 2, 0.05, 8, 28), mats.steelBright, 0, h / 2, w * 0.5); mover.add(rim);
      this.collide(box(mover, V(0, h / 2, -w * 0.25), V(h / 2, h / 2, w * 0.75 + 0.03))); // flat rainbow face: a box, not a rounded capsule end
      const housing = mesh(new THREE.BoxGeometry(h + 0.3, h + 0.3, 1.2), tMat(mats, 'blackSteel', 'darkSteel'), x, top + h / 2, -3.3); g.add(housing);
    } else {
      const matFor = { cheese: tMat(mats, 'cheese', 'padYellow'), jelly: tMat(mats, 'jelly', 'padTeal'), neon: tMat(mats, 'padViolet', 'padBlue'), sponge: tMat(mats, 'deck', 'padYellow') }[look] || mats.padOrange;
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), matFor); block.position.y = h / 2; block.castShadow = true; mover.add(block);
      if (look === 'neon') { const e = mesh(new THREE.BoxGeometry(w + 0.04, 0.08, w + 0.04), tMat(mats, 'cyan', 'steel'), 0, h - 0.04, 0); mover.add(e); }
      this.collide(box(mover, V(0, h / 2, 0), V(w / 2, h / 2, w / 2)));
      for (const dx of [-0.35, 0.35]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 3.2), mats.darkSteel, x + dx, top + 0.03, -1.2));
      g.add(mesh(new THREE.BoxGeometry(w + 0.3, 0.3, 1.5), mats.darkSteel, x, top - 0.15, -2.8));
    }
    shadowed(g); this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase);
    let s;
    if (u < 0.16) s = smooth(u / 0.16); else if (u < 0.3) s = 1; else if (u < 0.58) s = 1 - smooth((u - 0.3) / 0.28); else s = 0;
    this.mover.position.z = this.parkZ + (this.outZ - this.parkZ) * s;
  }
}

// ------------------------------------------------------------------ Press
/** A crusher that slams onto the deck, holds, rises. Run under it while it is up. */
export class Press extends Obstacle {
  constructor(mats, { id, x, top, period = 2.8, phase = 0, look = 'sandwich', w = 1.3, d = 2.2, upH = 2.7, hold = 0.18, rise = 0.3 }) {
    super(id, 'Press (' + look + ')', x);
    this.period = period; this.phase = phase; this.hold = hold; this.rise = rise;
    this.downY = top + 0.02; this.upY = top + upH;
    const g = this.group;
    const frameY = top + upH + 2.2;
    g.add(steelPost(mats, x, -2.1, top - 0.1, frameY + 0.2, 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 2.4), mats.darkSteel, x, frameY, -0.95));
    const mover = new THREE.Group(); mover.position.set(x, this.upY, 0); g.add(mover); this.mover = mover;
    const hh = 0.9;
    if (look === 'sandwich') {
      mover.add(mesh(new THREE.BoxGeometry(w, 0.3, d), tMat(mats, 'bread', 'padWhite'), 0, 0.15, 0));
      mover.add(mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), tMat(mats, 'ham', 'padRed'), 0, 0.39, 0));
      mover.add(mesh(new THREE.BoxGeometry(w * 0.98, 0.08, d * 0.98), tMat(mats, 'lettuce', 'padTeal'), 0, 0.52, 0));
      mover.add(mesh(new THREE.BoxGeometry(w, 0.32, d), tMat(mats, 'bread', 'padWhite'), 0, 0.72, 0));
    } else if (look === 'jelly') {
      mover.add(pad(w, hh, d, tMat(mats, 'jelly', 'padTeal'), 0.15)); mover.children[0].position.y = hh / 2;
    } else {
      mover.add(mesh(new THREE.BoxGeometry(w, hh, d), tMat(mats, 'carbon', 'darkSteel'), 0, hh / 2, 0));
      const edge = mesh(new THREE.BoxGeometry(w + 0.04, 0.1, d + 0.04), tMat(mats, 'red', 'padRed'), 0, 0.05, 0); mover.add(edge);
    }
    const rod = mesh(new THREE.CylinderGeometry(0.12, 0.12, frameY - this.downY, 12), mats.steelBright, 0, hh + (frameY - this.downY) / 2); mover.add(rod);
    this.collide(box(mover, V(0, hh / 2, 0), V(w / 2, hh / 2, d / 2)));
    shadowed(g); this.finish();
  }
  bottomAt(t) {
    const u = cyc(t, this.period, this.phase), { upY: up, downY: dn } = this;
    const h = 0.12 + this.hold;
    if (u < 0.12) { const k = u / 0.12; return up - (up - dn) * k * k; }
    if (u < h) return dn;
    if (u < h + this.rise) return dn + (up - dn) * smooth((u - h) / this.rise);
    return up;
  }
  update(t) { this.mover.position.y = this.bottomAt(t); }
}

// ------------------------------------------------------------------ LaneSwing
/**
 * Pendulum swinging ALONG the lane (seen side-on it sweeps left-right across the screen).
 * looks: sausage, claw (black curved tubes), pole (candy stripe), hammer (neon), axe.
 */
export class LaneSwing extends Obstacle {
  constructor(mats, { id, x, top, period = 2.8, amp = 0.8, len = 3.2, pivotH = 5.0, look = 'sausage', phase = 0 }) {
    super(id, 'Lane swing (' + look + ')', x);
    this.period = period; this.amp = amp; this.phase = phase;
    const g = this.group;
    const py = top + pivotH;
    const postMat = look === 'claw' ? tMat(mats, 'blackSteel', 'darkSteel') : null;
    const post = steelPost(mats, x, -2.0, top - 0.1, py + 0.3, 0.2); if (postMat) post.material = postMat; g.add(post);
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 2.3), postMat || mats.darkSteel, x, py + 0.15, -0.9));
    const pivot = new THREE.Group(); pivot.position.set(x, py, 0); g.add(pivot); this.pivot = pivot;
    const rodMat = look === 'pole' ? tMat(mats, 'lolly', 'padRed') : look === 'hammer' ? tMat(mats, 'cyan', 'steel') : mats.darkSteel;
    const rodR = look === 'pole' ? 0.16 : 0.06;
    const rod = mesh(new THREE.CylinderGeometry(rodR, rodR, len, 10), rodMat, 0, -len / 2); pivot.add(rod);
    const by = -len;
    if (look === 'sausage') {
      const s = mesh(new THREE.CapsuleGeometry(0.42, 1.5, 8, 20), tMat(mats, 'sausage', 'padRed'), 0, by - 0.8); pivot.add(s);
      this.collide(capsule(pivot, V(0, by + 0.02, 0), V(0, by - 1.6, 0), 0.43));
    } else if (look === 'claw') {
      // three black curved tubes like a claw
      for (const dz of [-0.55, 0, 0.55]) {
        const arc = mesh(new THREE.TorusGeometry(0.8, 0.17, 10, 20, Math.PI * 0.9), tMat(mats, 'blackSteel', 'iron'), 0, by - 0.6, dz);
        arc.rotation.z = Math.PI * 1.05; pivot.add(arc);
      }
      this.collide(box(pivot, V(0, by - 0.95, 0), V(1.0, 0.62, 0.8)));
    } else if (look === 'pole') {
      pivot.add(mesh(new THREE.SphereGeometry(0.34, 16, 12), tMat(mats, 'pinkWhite', 'padWhite'), 0, by));
      this.collide(capsule(pivot, V(0, by + 1.4, 0), V(0, by, 0), 0.3));
    } else { // hammer / axe
      const head = look === 'axe'
        ? mesh(new THREE.BoxGeometry(1.2, 1.1, 0.12), tMat(mats, 'white', 'steelBright'), 0, by - 0.5)
        : mesh(new THREE.BoxGeometry(1.5, 0.8, 1.0), tMat(mats, 'padPink', 'padRed'), 0, by - 0.35);
      pivot.add(head);
      if (look === 'hammer') for (const s of [-1, 1]) pivot.add(mesh(new THREE.BoxGeometry(0.06, 0.84, 1.04), tMat(mats, 'cyan', 'padWhite'), s * 0.76, by - 0.35));
      this.collide(look === 'axe' ? box(pivot, V(0, by - 0.5, 0), V(0.6, 0.55, 0.12)) : box(pivot, V(0, by - 0.35, 0), V(0.75, 0.4, 0.5)));
    }
    shadowed(g); this.finish();
  }
  update(t) { this.pivot.rotation.z = this.amp * Math.sin((TAU * t) / this.period + this.phase); }
}

// ------------------------------------------------------------------ CrossSwing
/** Pendulum swinging ACROSS the lane from a gantry (apple, spiked mace, peppermint, glowing orb). */
export class CrossSwing extends Obstacle {
  constructor(mats, { id, x, top, period = 3.0, amp = 1.05, len = 4.6, pivotH = 6.2, look = 'apple', r = 0.75, phase = 0 }) {
    super(id, 'Cross swing (' + look + ')', x);
    this.period = period; this.amp = amp; this.phase = phase;
    const g = this.group;
    const py = top + pivotH;
    const frameMat = look === 'apple' ? tMat(mats, 'cane', 'padRed') : look === 'mint' ? tMat(mats, 'lolly', 'padRed') : look === 'orb' ? tMat(mats, 'carbon', 'darkSteel') : tMat(mats, 'blackSteel', 'darkSteel');
    for (const dx of [-2.2, 2.2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, py + 0.3 - top + 0.1, 12), frameMat);
      p.position.set(x + dx, (py + 0.3 + top - 0.1) / 2, -2.2); g.add(p);
    }
    if (look === 'apple' || look === 'mint') { // candy-cane arch over the lane
      const arch = mesh(new THREE.TorusGeometry(2.2, 0.16, 10, 32, Math.PI), frameMat, x, py + 0.3, -2.2); g.add(arch);
    }
    g.add(mesh(new THREE.BoxGeometry(4.7, 0.28, 0.28), frameMat, x, py + 0.2, 0.05));
    for (const dx of [-2.2, 2.2]) g.add(mesh(new THREE.BoxGeometry(0.24, 0.24, 2.3), frameMat, x + dx, py + 0.2, -1.1));
    const pivot = new THREE.Group(); pivot.position.set(x, py, 0.05); g.add(pivot); this.pivot = pivot;
    pivot.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, len - r, 6), look === 'orb' ? tMat(mats, 'cyan', 'steel') : mats.darkSteel, 0, -(len - r) / 2));
    const by = -len;
    if (look === 'apple') {
      const a = mesh(new THREE.SphereGeometry(r, 36, 24), tMat(mats, 'apple', 'padRed'), 0, by); a.scale.set(1.05, 0.95, 1.05); pivot.add(a);
      pivot.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.35, 8), tMat(mats, 'stem', 'darkSteel'), 0, by + r * 0.95));
      const leaf = mesh(new THREE.SphereGeometry(0.22, 12, 8), tMat(mats, 'leaf', 'padTeal'), 0.2, by + r * 0.95 + 0.05); leaf.scale.set(1.4, 0.2, 0.7); pivot.add(leaf);
    } else if (look === 'mace') {
      pivot.add(mesh(new THREE.SphereGeometry(r, 28, 20), tMat(mats, 'blackSteel', 'iron'), 0, by));
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.42, 8);
      const dirs = [];
      for (let i = 0; i < 26; i++) { const yy = 1 - (i / 25) * 2, rr = Math.sqrt(1 - yy * yy), th = i * 2.4; dirs.push(new THREE.Vector3(Math.cos(th) * rr, yy, Math.sin(th) * rr)); }
      for (const d of dirs) {
        const s = new THREE.Mesh(spikeGeo, mats.steelBright);
        s.position.copy(d).multiplyScalar(r + 0.12).add(new THREE.Vector3(0, by, 0));
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); pivot.add(s);
      }
    } else if (look === 'mint') {
      const m = mesh(new THREE.SphereGeometry(r, 36, 24), tMat(mats, 'mint', 'padWhite'), 0, by); pivot.add(m);
      for (const s of [-1, 1]) { const tw = mesh(new THREE.ConeGeometry(0.3, 0.45, 10), tMat(mats, 'pinkWhite', 'padWhite'), s * (r + 0.18), by); tw.rotation.z = s * Math.PI / 2; pivot.add(tw); this.collide(sphere(pivot, V(s * (r + 0.12), by, 0), 0.26)); }
    } else {
      pivot.add(mesh(new THREE.SphereGeometry(r, 32, 20), tMat(mats, 'padPink', 'padRed'), 0, by));
      const ring = mesh(new THREE.TorusGeometry(r * 1.02, 0.05, 8, 40), tMat(mats, 'cyan', 'steel'), 0, by); pivot.add(ring);
    }
    this.collide(sphere(pivot, V(0, by, 0), r + (look === 'mace' ? 0.18 : 0)));
    shadowed(g); this.finish();
  }
  update(t) { this.pivot.rotation.x = this.amp * Math.sin((TAU * t) / this.period + this.phase); }
}

// ------------------------------------------------------------------ Windmill
/**
 * Blades turning in the camera plane from a hub behind the lane; each blade reaches
 * across the whole lane; the tips stop ~0.8 m above the deck, so slide under the blade coming down.
 * looks: cucumber, pinwheel, neon, steel.
 */
export class Windmill extends Obstacle {
  constructor(mats, { id, x, top, hubH = 3.0, radius = 2.2, blades = 3, speed = 1.0, look = 'cucumber', phase = 0 }) {
    super(id, 'Windmill (' + look + ')', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const hy = top + hubH;
    g.add(steelPost(mats, x, -2.1, top - 0.1, hy + 0.3, 0.2));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 12), mats.steel, x, hy, -1.6)).children;
    g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    const rot = new THREE.Group(); rot.position.set(x, hy, 0); g.add(rot); this.rot = rot;
    const hubMat = look === 'cucumber' ? tMat(mats, 'cookie', 'brass') : look === 'neon' ? tMat(mats, 'gold', 'brass') : look === 'pinwheel' ? tMat(mats, 'pinkWhite', 'padWhite') : mats.darkSteel;
    const hub = mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.4, 24), hubMat, 0, 0, -0.4); hub.rotation.x = Math.PI / 2; rot.add(hub);
    for (let k = 0; k < blades; k++) {
      const arm = new THREE.Group(); arm.rotation.z = (k / blades) * TAU; rot.add(arm);
      const L = radius - 0.4;
      if (look === 'cucumber') {
        const c = mesh(new THREE.CapsuleGeometry(0.3, L - 0.6, 6, 16), tMat(mats, 'cucumber', 'padTeal'), 0, 0.4 + L / 2, 0); arm.add(c); // rounded ends stay inside the box
        const c2 = c.clone(); c2.position.z = -0.75; arm.add(c2); const c3 = c.clone(); c3.position.z = 0.75; arm.add(c3);
        this.collide(box(arm, V(0, 0.4 + L / 2, 0), V(0.3, L / 2, 1.05)));
      } else if (look === 'pinwheel') {
        const blade = pad(0.3, L, 2.2, k % 2 ? tMat(mats, 'deck', 'padRed') : tMat(mats, 'pinkWhite', 'padWhite'), 0.12); blade.position.y = 0.4 + L / 2; arm.add(blade);
        this.collide(box(arm, V(0, 0.4 + L / 2, 0), V(0.15, L / 2, 1.1)));
      } else {
        const m = look === 'neon' ? tMat(mats, 'padCyan', 'padBlue') : tMat(mats, 'gunmetal', 'steel');
        const blade = pad(0.28, L, 2.2, m, 0.1); blade.position.y = 0.4 + L / 2; arm.add(blade);
        if (look === 'neon') arm.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 2.24), tMat(mats, 'pink', 'padRed'), 0, 0.4 + L - 0.05, 0));
        this.collide(box(arm, V(0, 0.4 + L / 2, 0), V(0.14, L / 2, 1.1)));
      }
    }
    shadowed(g); this.finish();
  }
  // blades come down toward the runner (clockwise as seen from the camera)
  update(t) { this.rot.rotation.z = -(this.speed * t) + this.phase; }
}

// ------------------------------------------------------------------ RollingThing
/** Something big rolling ACROSS the lane at deck level (apple, barrel, neon wheel): jump it. */
export class Roller extends Obstacle {
  constructor(mats, { id, x, top, period = 2.6, phase = 0, look = 'apple', r = 0.5, speed = 5.5 }) {
    super(id, 'Roller (' + look + ')', x);
    this.period = period; this.phase = phase; this.speed = speed; this.r = r; this.top = top;
    const g = this.group;
    const mover = new THREE.Group(); g.add(mover); this.mover = mover;
    const spin = new THREE.Group(); mover.add(spin); this.spin = spin;
    const m = look === 'apple' ? tMat(mats, 'apple', 'padRed') : look === 'neon' ? tMat(mats, 'padGold', 'padYellow') : mats.darkWood;
    if (look === 'barrel') { const b = mesh(new THREE.CylinderGeometry(r, r, 1.1, 24), m); spin.add(b); }
    else { const b = mesh(new THREE.SphereGeometry(r, 28, 20), m); spin.add(b); if (look === 'neon') spin.add(mesh(new THREE.TorusGeometry(r, 0.05, 6, 30), tMat(mats, 'cyan', 'steel'))); }
    // chute it drops out of, behind the deck
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.2, 2.6), mats.darkSteel, x, top + r * 2 + 0.3, -3.3));
    this.collide(sphere(mover, V(0, 0, 0), r));
    shadowed(g); this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase) * this.period;
    const z = -3.0 + this.speed * u;
    const vis = z < 4.5;
    this.mover.visible = vis;
    this.mover.position.set(this.x, this.top + this.r + 0.02, vis ? z : -3.0);
    this.spin.rotation.x = z / this.r;
  }
}
