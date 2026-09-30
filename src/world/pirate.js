import * as THREE from 'three';
import { Obstacle, V, pad, shadowed, steelPost, woodPost } from './obstacles.js';
import { box, sphere, capsule } from '../collision.js';
import { cylinderUV } from './materials.js';
import { skullTexture } from './textures.js';

// Episode 2 (pirate cove) obstacles. Each one follows the motion described in
// docs/SPEC_NOTES.md; everything is driven by the course clock `t` so the
// timing is identical on every attempt (the PDF asks for deterministic motion).

const TAU = Math.PI * 2;
const smooth = (u) => u * u * (3 - 2 * u);

let skullMats = null;
function skullCrateMaterials(mats) {
  if (!skullMats) {
    const tex = skullTexture();
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.1 });
    const plain = new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.7, metalness: 0.1 });
    skullMats = [face, face, plain, plain, face, face];
  }
  return skullMats;
}

// ------------------------------------------------------------------ Sweeper
/** Orange hub on the deck edge with a striped arm sweeping just above the planks. Jump it. */
export class Sweeper extends Obstacle {
  constructor(mats, { id, x, top, speed = 2.0, hubZ = -1.05, len = 2.75, phase = 0 }) {
    super(id, 'Sweeper', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.34, 24), mats.darkSteel);
    base.position.set(x, top + 0.17, hubZ);
    g.add(base);
    const rot = new THREE.Group();
    rot.position.set(x, top + 0.2, hubZ);
    g.add(rot);
    this.rot = rot;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.34, 24), mats.padOrange);
    hub.position.y = 0.16; rot.add(hub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, TAU, 0, Math.PI / 2), mats.brass);
    cap.position.y = 0.33; rot.add(cap);
    // rope-wrapped arm: alternating red / white segments
    const segs = 9, segLen = len / segs;
    for (let i = 0; i < segs; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, segLen, 10), i % 2 ? mats.padWhite : mats.padRed);
      m.rotation.x = Math.PI / 2;
      m.position.z = 0.3 + segLen * (i + 0.5);
      rot.add(m);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mats.steel);
    knob.position.z = 0.3 + len; rot.add(knob);
    this.collide(capsule(rot, V(0, 0, 0.3), V(0, 0, 0.3 + len), 0.1));
    this.reach = 0.3 + len;
    shadowed(g);
    this.finish();
  }
  update(t) { this.rot.rotation.y = this.speed * t + this.phase; }
}

// ------------------------------------------------------------------ Propeller rotor
/** Four long steel arms turning at head height from a post behind the deck. Slide under (or jump). */
export class Rotor extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.35, postZ = -2.0, len = 3.1, h = 1.32, phase = 0 }) {
    super(id, 'Propeller rotor', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    g.add(woodPost(mats, x, postZ, -2.5, top + h - 0.12, 0.22));
    const rot = new THREE.Group();
    rot.position.set(x, top + h, postZ);
    g.add(rot);
    this.rot = rot;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.36, 24), mats.darkWood);
    rot.add(hub);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, TAU, 0, Math.PI / 2), mats.brass);
    dome.position.y = 0.18; rot.add(dome);
    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group();
      arm.rotation.y = (k / 4) * TAU;
      rot.add(arm);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), mats.steelBright);
      tube.rotation.x = Math.PI / 2; tube.position.z = len / 2; arm.add(tube);
      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 14), mats.steel);
      endCap.rotation.x = Math.PI / 2; endCap.position.z = len - 0.18; arm.add(endCap);
      this.collide(capsule(arm, V(0, 0, 0.4), V(0, 0, len), 0.13));
    }
    this.reach = len + 0.1;
    shadowed(g);
    this.finish();
  }
  update(t) { this.rot.rotation.y = -this.speed * t + this.phase; }
}

// ------------------------------------------------------------------ Pendulums (barrel / anchor)
/** Barrel or anchor hanging from a gantry, swinging across the lane. */
export class Pendulum extends Obstacle {
  constructor(mats, { id, x, top, shape = 'barrel', period = 3.0, amp = 1.05, len = 4.7, pivotH = 6.3, phase = 0 }) {
    super(id, shape === 'anchor' ? 'Anchor pendulum' : 'Swinging barrel', x);
    this.period = period; this.amp = amp; this.phase = phase;
    const g = this.group;
    const py = top + pivotH;
    for (const dx of [-2.3, 2.3]) {
      g.add(woodPost(mats, x + dx, -2.3, -2.5, py + 0.3, 0.2));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 2.5), mats.darkWood);
      arm.position.set(x + dx, py + 0.22, -1.1); g.add(arm);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.32, 0.32), mats.darkWood);
    beam.position.set(x, py + 0.22, 0.1); g.add(beam);
    const pivot = new THREE.Group();
    pivot.position.set(x, py, 0.1);
    g.add(pivot);
    this.pivot = pivot;
    if (shape === 'barrel') {
      const r = 0.58, L = 1.15;
      const ropeLen = len - r;
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, ropeLen, 8), mats.rope);
      rope.position.y = -ropeLen / 2; pivot.add(rope);
      const barrel = new THREE.Mesh(cylinderUV(new THREE.CylinderGeometry(r * 0.94, r * 0.94, L, 28, 1), r, L, 1.2), mats.darkWood);
      barrel.rotation.z = Math.PI / 2; barrel.position.y = -len; pivot.add(barrel);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 16), mats.darkWood);
      belly.scale.set(0.72, 1, 1); belly.position.y = -len; pivot.add(belly);
      for (const bx of [-0.42, 0, 0.42]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(r * (bx === 0 ? 1.0 : 0.95), 0.035, 8, 36), mats.darkSteel);
        band.rotation.y = Math.PI / 2; band.position.set(bx, -len, 0); pivot.add(band);
      }
      this.collide(capsule(pivot, V(-0.42, -len, 0), V(0.42, -len, 0), r));
    } else {
      // anchor: shank + stock + curved arms with flukes, all black iron
      const chainLen = len - 1.9;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, chainLen, 8), mats.darkSteel);
      chain.position.y = -chainLen / 2; pivot.add(chain);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), mats.iron);
      ring.position.y = -chainLen - 0.15; pivot.add(ring);
      const shank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), mats.iron);
      shank.position.y = -chainLen - 1.25; pivot.add(shank);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.16), mats.iron);
      stock.position.y = -chainLen - 0.55; pivot.add(stock);
      const armsY = -len + 0.3;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.11, 10, 30, Math.PI), mats.iron);
      arc.rotation.z = Math.PI; arc.position.y = armsY + 0.2; pivot.add(arc);
      for (const s of [-1, 1]) {
        const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), mats.iron);
        fluke.position.set(s * 0.85, armsY + 0.35, 0); fluke.scale.z = 0.4; pivot.add(fluke);
      }
      this.collide(capsule(pivot, V(0, -chainLen - 0.4, 0), V(0, -len - 0.62, 0), 0.16));
      this.collide(capsule(pivot, V(-0.85, armsY + 0.25, 0), V(-0.3, -len - 0.5, 0), 0.14));
      this.collide(capsule(pivot, V(0.85, armsY + 0.25, 0), V(0.3, -len - 0.5, 0), 0.14));
    }
    this.reach = 0.9;
    shadowed(g);
    this.finish();
  }
  update(t) { this.pivot.rotation.x = this.amp * Math.sin((TAU * t) / this.period + this.phase); }
}

// ------------------------------------------------------------------ Iron roller gate
/** Black iron frame cantilevered from behind the deck: two bars circle through the lane. */
export class IronRoller extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.25, radius = 1.8, hubH = 2.05, bars = 2, phase = 0 }) {
    super(id, 'Iron roller gate', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const hy = top + hubH;
    g.add(steelPost(mats, x, -2.0, -2.5, hy + 0.35, 0.2));
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 12), mats.darkSteel);
    stub.rotation.x = Math.PI / 2; stub.position.set(x, hy, -1.75); g.add(stub);
    const rot = new THREE.Group();
    rot.position.set(x, hy, 0);
    g.add(rot);
    this.rot = rot;
    const half = 1.5;
    for (const z of [-half, half]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 18), mats.iron);
      hub.rotation.x = Math.PI / 2; hub.position.z = z; rot.add(hub);
    }
    for (let k = 0; k < bars; k++) {
      const a = (k / bars) * TAU;
      const arm = new THREE.Group();
      arm.rotation.z = a;
      rot.add(arm);
      for (const z of [-half, half]) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius, 0.16, 0.16), mats.iron);
        spoke.position.set(radius / 2, 0, z); arm.add(spoke);
        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 18, Math.PI * 1.3), mats.iron);
        curl.position.set(radius + 0.05, 0.3, z); arm.add(curl);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, half * 2 + 0.2, 16), mats.iron);
      bar.rotation.x = Math.PI / 2; bar.position.x = radius; arm.add(bar);
      this.collide(capsule(arm, V(radius, 0, -half), V(radius, 0, half), 0.15));
    }
    this.reach = radius + 0.2;
    shadowed(g);
    this.finish();
  }
  // bars come down toward the runner (clockwise as seen from the camera)
  update(t) { this.rot.rotation.z = -(this.speed * t) + this.phase; }
}

// ------------------------------------------------------------------ Stamper piston
/** Red/white piston that slams onto the deck, holds, then rises again. */
export class Stamper extends Obstacle {
  constructor(mats, { id, x, top, period = 2.6, phase = 0, down = null, upH = 2.6, hold = 0.24, rise = 0.44 }) {
    super(id, 'Stamper piston', x);
    this.period = period; this.phase = phase;
    this.hold = hold; this.rise = rise; // fractions of the cycle
    this.downY = down ?? top + 0.02;
    this.upY = top + upH;
    const g = this.group;
    const frameY = top + upH + 2.4;
    g.add(steelPost(mats, x, -2.1, -2.5, frameY + 0.2, 0.2));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.4), mats.darkSteel);
    arm.position.set(x, frameY, -0.95); g.add(arm);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.8, 18), mats.darkSteel);
    housing.position.set(x, frameY - 0.1, 0); g.add(housing);
    const mover = new THREE.Group();
    mover.position.set(x, this.upY, 0);
    g.add(mover);
    this.mover = mover;
    const head = new THREE.Group();
    mover.add(head);
    const white = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.45, 32), mats.padWhite);
    white.position.y = 0.225; head.add(white);
    const red = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.4, 32), mats.padRed);
    red.position.y = 0.65; head.add(red);
    const rodLen = frameY - this.downY;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, rodLen, 14), mats.steelBright);
    rod.position.y = 0.85 + rodLen / 2; mover.add(rod);
    this.collide(box(mover, V(0, 0.43, 0), V(0.56, 0.43, 0.56)));
    this.reach = 0.62;
    shadowed(g);
    this.finish();
  }
  bottomAt(t) {
    const u = (((t + this.phase) % this.period) + this.period) % this.period / this.period;
    const { upY: up, downY: dn } = this;
    if (u < 0.12) { const k = u / 0.12; return up - (up - dn) * k * k; } // accelerating slam
    const h = 0.12 + this.hold;
    if (u < h) return dn;                                                // hold down
    if (u < h + this.rise) return dn + (up - dn) * smooth((u - h) / this.rise); // rise
    return up;
  }
  update(t) { this.mover.position.y = this.bottomAt(t); }
}

// ------------------------------------------------------------------ Ship-wheel spinner
/** Horizontal ship's wheel on a round platform; its handles sweep across at knee height. */
export class WheelSpinner extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.1, hubZ = -1.6, len = 3.25, spokes = 6, h = 0.55, phase = 0 }) {
    super(id, 'Ship-wheel spinner', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, h, 16), mats.darkSteel);
    post.position.set(x, top + h / 2, hubZ); g.add(post);
    const rot = new THREE.Group();
    rot.position.set(x, top + h, hubZ);
    g.add(rot);
    this.rot = rot;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 20), mats.brass);
    rot.add(hub);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 10, 40), mats.darkWood);
    rim.rotation.x = Math.PI / 2; rot.add(rim);
    for (let k = 0; k < spokes; k++) {
      const arm = new THREE.Group();
      arm.rotation.y = (k / spokes) * TAU;
      rot.add(arm);
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), mats.darkWood);
      spoke.rotation.x = Math.PI / 2; spoke.position.z = 0.45; arm.add(spoke);
      // turned wooden handle: thin neck, fat grip, knob
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, len - 1.9, 10), mats.darkWood);
      neck.rotation.x = Math.PI / 2; neck.position.z = 0.9 + (len - 1.9) / 2; arm.add(neck);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 12), mats.darkWood);
      grip.rotation.x = Math.PI / 2; grip.position.z = len - 0.55; arm.add(grip);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mats.darkWood);
      knob.position.z = len - 0.05; arm.add(knob);
      this.collide(capsule(arm, V(0, 0, 0.8), V(0, 0, len), 0.14));
    }
    this.reach = 0.5;
    shadowed(g);
    this.finish();
  }
  update(t) { this.rot.rotation.y = this.speed * t + this.phase; }
}

// ------------------------------------------------------------------ Side cannon
/** Cannon behind the deck firing an iron ball across the lane every `period` seconds. */
export class SideCannon extends Obstacle {
  constructor(mats, { id, x, top, period = 2.4, phase = 0, speed = 8.5, h = 1.0 }) {
    super(id, 'Side cannon', x);
    this.period = period; this.phase = phase; this.speed = speed;
    this.y0 = top + h; this.z0 = -2.35;
    const g = this.group;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), skullCrateMaterials(mats));
    crate.position.set(x, top + h - 0.1, -3.1);
    g.add(crate);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.1, h + 2.6, 1.1), mats.darkWood);
    stand.position.set(x, top + h - 0.75 - (h + 2.6) / 2 + 0.05, -3.1); g.add(stand);
    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(x, this.y0, -2.6);
    g.add(barrelGroup);
    this.barrel = barrelGroup;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 1.1, 24, 1, true), mats.iron);
    tube.rotation.x = Math.PI / 2; barrelGroup.add(tube);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 10, 28), mats.brass);
    lip.position.z = 0.55; barrelGroup.add(lip);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.33, 20), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    bore.position.z = 0.2; barrelGroup.add(bore);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0, depthWrite: false }));
    flash.position.z = 0.8; barrelGroup.add(flash);
    this.flash = flash;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), mats.iron);
    ball.castShadow = true;
    this.mover = new THREE.Group();
    this.mover.add(ball);
    g.add(this.mover);
    this.collide(sphere(this.mover, V(0, 0, 0), 0.42));
    this.reach = 0.5;
    shadowed(g);
    this.finish();
  }
  update(t) {
    const tau = (((t + this.phase) % this.period) + this.period) % this.period;
    const flight = 1.25;
    if (tau < flight) {
      this.mover.visible = true;
      this.mover.position.set(this.x, this.y0 - 3.2 * tau * tau, this.z0 + this.speed * tau);
    } else {
      this.mover.visible = false;
      this.mover.position.set(this.x, this.y0, this.z0 - 0.4); // parked inside the barrel
    }
    // recoil + muzzle flash right after firing
    const kick = tau < 0.25 ? Math.sin((tau / 0.25) * Math.PI) : 0;
    this.barrel.position.z = -2.6 - kick * 0.25;
    this.flash.material.opacity = tau < 0.15 ? 1 - tau / 0.15 : 0;
    this.flash.scale.setScalar(0.6 + tau * 4);
  }
}

// ------------------------------------------------------------------ Blade pendulum
/** Tall steel blade hanging from an overhead arm, swinging along the lane. */
export class BladePendulum extends Obstacle {
  constructor(mats, { id, x, top, period = 2.6, amp = 0.85, len = 3.0, pivotH = 5.1, phase = 0 }) {
    super(id, 'Blade pendulum', x);
    this.period = period; this.amp = amp; this.phase = phase;
    const g = this.group;
    const py = top + pivotH;
    g.add(woodPost(mats, x, -2.0, -2.5, py + 0.35, 0.22));
    // curved brace like the arch in the reference
    const brace = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 10, 24, Math.PI / 2), mats.darkWood);
    brace.position.set(x, py - 1.0, -1.0); brace.rotation.y = Math.PI / 2; g.add(brace);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.3), mats.darkWood);
    arm.position.set(x, py + 0.15, -0.9); g.add(arm);
    const pivot = new THREE.Group();
    pivot.position.set(x, py, 0);
    g.add(pivot);
    this.pivot = pivot;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), mats.darkSteel);
    axle.rotation.x = Math.PI / 2; pivot.add(axle);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.14, len, 0.14), mats.darkSteel);
    rod.position.y = -len / 2; pivot.add(rod);
    // axe blade: flat, bevelled, curved cutting edge
    const w = 1.0, hgt = 1.3;
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.28, 0);
    shape.lineTo(w * 0.28, 0);
    shape.lineTo(w * 0.5, -hgt * 0.8);
    shape.quadraticCurveTo(0, -hgt * 1.08, -w * 0.5, -hgt * 0.8);
    shape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
    bladeGeo.translate(0, 0, -0.04);
    const blade = new THREE.Mesh(bladeGeo, mats.steelBright);
    blade.position.y = -len; pivot.add(blade);
    this.collide(box(pivot, V(0, -len - hgt * 0.53, 0), V(0.52, hgt * 0.53, 0.1))); // covers the curved cutting edge too
    this.collide(box(pivot, V(0, -len / 2, 0), V(0.09, len / 2, 0.09)));
    this.reach = Math.sin(amp) * (len + hgt) + 0.5;
    shadowed(g);
    this.finish();
  }
  update(t) { this.pivot.rotation.z = this.amp * Math.sin((TAU * t) / this.period + this.phase); }
}

// ------------------------------------------------------------------ Skull crate pusher
/** Black skull crate that slides out across the lane and back, pushing runners into the pool. */
export class SkullCrate extends Obstacle {
  constructor(mats, { id, x, top, period = 3.2, phase = 0, w = 1.2, h = 1.7 }) {
    super(id, 'Skull crate', x);
    this.period = period; this.phase = phase;
    this.parkZ = -2.35; this.outZ = 0.35;
    const g = this.group;
    // iron rails the crate rides on, running back off the deck
    for (const dx of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 3.4), mats.darkSteel);
      rail.position.set(x + dx, top + 0.03, -1.1); g.add(rail);
    }
    const dock = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, 1.5), mats.darkWood);
    dock.position.set(x, top - 0.15, -2.6); g.add(dock);
    g.add(woodPost(mats, x, -2.6, -2.5, top - 0.3, 0.2));
    const mover = new THREE.Group();
    mover.position.set(x, top + 0.06, this.parkZ);
    g.add(mover);
    this.mover = mover;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), skullCrateMaterials(mats));
    crate.position.y = h / 2; mover.add(crate);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.1, w + 0.06), mats.brass);
    trim.position.y = h - 0.05; mover.add(trim);
    this.collide(box(mover, V(0, h / 2, 0), V(w / 2, h / 2, w / 2)));
    this.reach = w / 2 + 0.1;
    shadowed(g);
    this.finish();
  }
  update(t) {
    const u = (((t + this.phase) % this.period) + this.period) % this.period / this.period;
    // quick shove out, short hold, slower return, rest parked
    let s;
    if (u < 0.18) s = smooth(u / 0.18);
    else if (u < 0.32) s = 1;
    else if (u < 0.6) s = 1 - smooth((u - 0.32) / 0.28);
    else s = 0;
    this.mover.position.z = this.parkZ + (this.outZ - this.parkZ) * s;
  }
}

// ------------------------------------------------------------------ Vertical ship wheel
/** Big ship's wheel facing the camera behind the lane; its long handle pins sweep through the lane. */
export class VerticalWheel extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.0, hubH = 2.1, radius = 1.85, pegs = 2, phase = 0 }) {
    super(id, 'Vertical ship wheel', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const wz = -1.35, hy = top + hubH;
    g.add(woodPost(mats, x, -2.05, -2.5, hy + 0.3, 0.22));
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 12), mats.darkSteel);
    axle.rotation.x = Math.PI / 2; axle.position.set(x, hy, -1.7); g.add(axle);
    const rot = new THREE.Group();
    rot.position.set(x, hy, wz);
    g.add(rot);
    this.rot = rot;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 20), mats.brass);
    hub.rotation.x = Math.PI / 2; rot.add(hub);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.1, 10, 48), mats.darkWood);
    rot.add(rim);
    const rimIn = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.05, 8, 48), mats.brass);
    rimIn.position.z = 0.08; rot.add(rimIn);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, radius, 8), mats.darkWood);
      spoke.position.set(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0);
      spoke.rotation.z = a - Math.PI / 2; rot.add(spoke);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.darkWood);
      knob.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0); rot.add(knob);
    }
    // handle pins sticking out toward the camera across the whole lane
    const pinLen = 1.75;
    for (let k = 0; k < pegs; k++) {
      const a = (k / pegs) * TAU + TAU / 16;
      const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, pinLen, 12), mats.darkWood);
      pin.rotation.x = Math.PI / 2; pin.position.set(px, py, pinLen / 2); rot.add(pin);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mats.brass);
      cap.position.set(px, py, pinLen); rot.add(cap);
      this.collide(capsule(rot, V(px, py, 0.1), V(px, py, pinLen), 0.14));
    }
    this.reach = radius + 0.2;
    shadowed(g);
    this.finish();
  }
  update(t) { this.rot.rotation.z = -(this.speed * t) + this.phase; }
}

// ------------------------------------------------------------------ Decorations
/** A shark that leaps out of the pool behind the deck every few seconds (scenery only). */
export class SharkLeap {
  constructor(mats, { x, z = -4.2, period = 5.5, phase = 0, top = 1.4 }) {
    this.x = x; this.z = z; this.period = period; this.phase = phase; this.top = top;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 16), mats.shark);
    body.scale.set(2.3, 0.9, 0.95); g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.47, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2), mats.sharkBelly);
    belly.scale.set(2.2, 0.85, 0.9); belly.position.y = -0.03; g.add(belly);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 4), mats.shark);
    fin.scale.z = 0.25; fin.rotation.z = -0.35; fin.position.set(-0.1, 0.62, 0); g.add(fin);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), mats.shark);
      side.scale.z = 0.25; side.rotation.set(s * 1.1, 0, 0.9); side.position.set(0.25, -0.25, s * 0.35); g.add(side);
    }
    const tail = new THREE.Group();
    tail.position.x = -1.1; g.add(tail);
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 4), mats.shark);
      lobe.scale.z = 0.25; lobe.rotation.z = s * 0.8 + Math.PI / 2; lobe.position.set(-0.25, s * 0.28, 0); tail.add(lobe);
    }
    this.tail = tail;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
      eye.position.set(0.8, 0.12, s * 0.33); g.add(eye);
    }
    shadowed(g);
    this.group = g;
    g.visible = false;
  }
  update(t) {
    const u = (((t + this.phase) % this.period) + this.period) % this.period;
    const dur = 1.6;
    if (u > dur) { this.group.visible = false; return; }
    const k = u / dur;
    this.group.visible = true;
    const x = this.x - 2.4 + 4.8 * k;
    const y = -0.8 + Math.sin(k * Math.PI) * (this.top + 2.2);
    this.group.position.set(x, y, this.z);
    this.group.rotation.z = Math.cos(k * Math.PI) * 0.9; // nose up, then nose down
    this.tail.rotation.y = Math.sin(u * 14) * 0.35;
  }
}

/** Skull-and-crossbones crate used as scenery on deck corners. */
export function skullCrateProp(mats, x, y, z, s = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), skullCrateMaterials(mats));
  m.position.set(x, y + s / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
