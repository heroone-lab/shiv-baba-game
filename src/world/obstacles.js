import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { box, sphere, capsule } from '../collision.js';
import { cylinderUV, boxUV } from './materials.js';

// Obstacle motion follows the reference addendum:
//  horizontal rotating  -> constant angular velocity around a long horizontal axle
//  vertical rotating    -> continuous yaw around a vertical pivot
//  pendulum             -> bounded arc with smooth reversal (sine)
//  lateral / gate       -> bounded motion with eased reversal
//  static               -> no motion
// All motion is driven by the shared course clock `t` so timing is deterministic.

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function shadowed(o) {
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
}

export function woodPost(mats, x, z, y0, y1, r = 0.17) {
  const h = y1 - y0;
  const geo = cylinderUV(new THREE.CylinderGeometry(r, r * 1.08, h, 14), r, h, 0.6);
  const m = new THREE.Mesh(geo, mats.bark);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function steelPost(mats, x, z, y0, y1, r = 0.12) {
  const h = y1 - y0;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mats.steel);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function pad(w, h, d, mat, r = 0.1) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

class Obstacle {
  constructor(id, name, x) {
    this.id = id; this.name = name; this.x = x;
    this.group = new THREE.Group();
    this.colliders = [];
    this.phase = 0;
  }
  collide(c) { c.node.userData.prev = new THREE.Matrix4(); this.colliders.push(c); return c; }
  savePrev() { for (const c of this.colliders) c.node.userData.prev.copy(c.node.matrixWorld); }
  update(t) {}
  finish() {
    // moving parts must stay separate objects; everything else can be merged
    for (const k of ['pivot', 'rot', 'rotor']) if (this[k]) this[k].userData.dynamic = true;
    this.group.updateMatrixWorld(true);
    this.savePrev();
  }
}

// O1 / O5 — log on a horizontal axle with padded paddles sweeping the deck.
export class PaddleLog extends Obstacle {
  constructor(mats, { id, x, top, arms = 2, speed = 1.3, axleH = 2.55, phase = 0, color = 'padRed' }) {
    super(id, 'Horizontal rotating log', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const axleY = top + axleH;
    // cantilevered from a braced tower behind the deck, so nothing blocks the side camera
    for (const dx of [-0.35, 0.35]) g.add(woodPost(mats, x + dx, -2.05, -2.5, axleY + 0.45, 0.2));
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.5), mats.darkSteel);
    cap.position.set(x, axleY, -2.05); cap.castShadow = true; g.add(cap);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.18), mats.steel);
    brace.position.set(x, axleY - 1.2, -2.05); g.add(brace);
    const pivot = new THREE.Group();
    pivot.position.set(x, axleY, 0);
    g.add(pivot);
    this.pivot = pivot;

    const logR = 0.34, logL = 3.7;
    const log = new THREE.Mesh(cylinderUV(new THREE.CylinderGeometry(logR, logR, logL, 24), logR, logL, 0.7), mats.bark);
    log.rotation.x = Math.PI / 2;
    log.position.z = -0.1;
    pivot.add(log);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), mats.steel);
    shaft.rotation.x = Math.PI / 2; shaft.position.z = -1.95; pivot.add(shaft);
    for (const z of [-logL / 2 - 0.1, logL / 2 - 0.1]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(logR * 1.05, logR * 1.05, 0.12, 24), mats.darkSteel);
      hub.rotation.x = Math.PI / 2; hub.position.z = z; pivot.add(hub);
    }
    this.collide(capsule(pivot, V(0, 0, -1.6), V(0, 0, 1.6), logR));

    const reach = axleH - 0.14; // paddle tip just above the deck
    const padLen = 1.25;
    const beamLen = reach - padLen - logR + 0.1;
    for (let k = 0; k < arms; k++) {
      const arm = new THREE.Group();
      arm.rotation.z = (k / arms) * Math.PI * 2;
      pivot.add(arm);
      for (const z of [-0.65, 0.65]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, beamLen, 0.14), mats.steel);
        beam.position.set(0, -(logR - 0.05 + beamLen / 2), z);
        arm.add(beam);
      }
      const paddle = pad(0.44, padLen, 2.0, mats[color], 0.16);
      paddle.position.set(0, -(reach - padLen / 2), 0);
      arm.add(paddle);
      const stripe = pad(0.46, 0.18, 2.02, mats.padWhite, 0.06);
      stripe.position.set(0, -(reach - padLen * 0.72), 0);
      arm.add(stripe);
      this.collide(box(arm, V(0, -(reach - padLen / 2), 0), V(0.22, padLen / 2, 1.0)));
      this.collide(box(arm, V(0, -(logR + beamLen / 2), 0), V(0.08, beamLen / 2, 0.72)));
    }
    shadowed(g);
    this.finish();
  }
  update(t) { this.pivot.rotation.z = this.speed * t + this.phase; }
}

// O2 — wide padded blocker yawing around a vertical pivot beside the deck.
export class VerticalBlocker extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.05, pivotZ = -2.45, len = 4.1, phase = 0 }) {
    super(id, 'Vertical rotating blocker', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    g.add(steelPost(mats, x, pivotZ, -2.5, top + 2.1, 0.2));
    const rot = new THREE.Group();
    rot.position.set(x, top, pivotZ);
    g.add(rot);
    this.rot = rot;
    const wallLen = len - 0.45, wallH = 1.1, wallY = 0.42 + wallH / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, wallH + 0.2, 20), mats.darkSteel);
    hub.position.y = wallY; rot.add(hub);
    for (const yy of [wallY - 0.3, wallY + 0.3]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.6), mats.steel);
      link.position.set(0, yy, 0.35); rot.add(link);
    }
    const wall = pad(0.48, wallH, wallLen, mats.padOrange, 0.18);
    wall.position.set(0, wallY, 0.45 + wallLen / 2);
    rot.add(wall);
    const band = pad(0.5, 0.22, wallLen + 0.02, mats.padYellow, 0.08);
    band.position.set(0, wallY + 0.2, 0.45 + wallLen / 2);
    rot.add(band);
    this.collide(box(rot, V(0, wallY, 0.45 + wallLen / 2), V(0.24, wallH / 2, wallLen / 2)));
    shadowed(g);
    this.finish();
  }
  // negative yaw: the wall crosses the lane moving toward the runner (-X)
  update(t) { this.rot.rotation.y = -(this.speed * t) + this.phase; }
}

// O3 — padded wrecking ball on a rope; pendulum swinging across the runner's route.
export class SwingingBall extends Obstacle {
  constructor(mats, { id, x, top, period = 3.2, amp = 1.13, len = 5.3, pivotH = 6.9, radius = 0.85, phase = 0 }) {
    super(id, 'Swinging ball / hammer', x);
    this.period = period; this.amp = amp; this.phase = phase;
    const g = this.group;
    const py = top + pivotH;
    for (const dx of [-2.6, 2.6]) {
      g.add(steelPost(mats, x + dx, -2.3, -2.5, py + 0.25, 0.16));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.5), mats.steel);
      arm.position.set(x + dx, py + 0.2, -1.1); g.add(arm);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 0.3), mats.darkSteel);
    beam.position.set(x, py + 0.2, 0.1); g.add(beam);
    const pivot = new THREE.Group();
    pivot.position.set(x, py, 0.1);
    g.add(pivot);
    this.pivot = pivot;
    const ropeLen = len - radius + 0.05;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ropeLen, 8), mats.rope);
    rope.position.y = -ropeLen / 2; pivot.add(rope);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), mats.padRed);
    ball.position.y = -len; pivot.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, 0.08, 12, 48), mats.padWhite);
    ring.rotation.y = Math.PI / 2; ring.position.y = -len; pivot.add(ring);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.25, 16), mats.steel);
    cap.position.y = -len + radius + 0.05; pivot.add(cap);
    this.collide(sphere(pivot, V(0, -len, 0), radius));
    shadowed(g);
    this.finish();
  }
  update(t) { this.pivot.rotation.x = this.amp * Math.sin((2 * Math.PI * t) / this.period + this.phase); }
}

// O4 — compact centre-mounted rotating bar spinning through a water gap.
export class GapSpinner extends Obstacle {
  constructor(mats, { id, x, top, speed = 1.15, radius = 1.5, hubH = 1.1, phase = 0 }) {
    super(id, 'Small centre rotating blocker', x);
    this.speed = speed; this.phase = phase;
    const g = this.group;
    const hy = top + hubH;
    g.add(steelPost(mats, x, -2.0, -2.5, hy + 0.3, 0.18));
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.0, 12), mats.steel);
    axle.rotation.x = Math.PI / 2; axle.position.set(x, hy, -1.0); g.add(axle);
    const rotor = new THREE.Group();
    rotor.position.set(x, hy, 0);
    g.add(rotor);
    this.rotor = rotor;
    const bar = pad(radius * 2, 0.34, 0.9, mats.padYellow, 0.15);
    rotor.add(bar);
    for (const s of [-1, 1]) {
      const tip = pad(0.36, 0.38, 0.94, mats.padRed, 0.14);
      tip.position.x = s * (radius - 0.18); rotor.add(tip);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 20), mats.darkSteel);
    hub.rotation.x = Math.PI / 2; rotor.add(hub);
    this.collide(box(rotor, V(0, 0, 0), V(radius, 0.19, 0.47)));
    shadowed(g);
    this.finish();
  }
  update(t) { this.rotor.rotation.z = -(this.speed * t) + this.phase; }
}

// O6 — tall padded gate arm swinging (eased) across the lane from a side pivot.
export class SwingGate extends Obstacle {
  constructor(mats, { id, x, top, period = 3.4, pivotZ = -1.8, len = 3.2, phase = 0 }) {
    super(id, 'Vertical swinging arm (gate)', x);
    this.period = period; this.phase = phase;
    const g = this.group;
    g.add(steelPost(mats, x, pivotZ, -2.5, top + 3.4, 0.2));
    const rot = new THREE.Group();
    rot.position.set(x, top, pivotZ);
    g.add(rot);
    this.rot = rot;
    const panelH = 2.35, panelY = 0.3 + panelH / 2, panelZ = 0.4 + len / 2;
    const panel = pad(0.42, panelH, len, mats.padBlue, 0.18);
    panel.position.set(0, panelY, panelZ); rot.add(panel);
    for (const yy of [0.75, 2.05]) {
      const s = pad(0.44, 0.24, len + 0.02, mats.padYellow, 0.09);
      s.position.set(0, yy, panelZ); rot.add(s);
    }
    for (const yy of [0.55, 2.55]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), mats.steel);
      hinge.position.set(0, yy, 0.2); rot.add(hinge);
    }
    this.collide(box(rot, V(0, panelY, panelZ), V(0.21, panelH / 2, len / 2)));
    shadowed(g);
    this.finish();
  }
  update(t) {
    // open (-90°, parked along the deck edge) <-> closed (0°, across the lane), eased reversal
    const s = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / this.period + this.phase);
    this.rot.rotation.y = -Math.PI / 2 + (Math.PI / 2) * s;
  }
}

// Static low beam — slide under it (or clear it with a perfect jump).
export class SlideBeam extends Obstacle {
  constructor(mats, { id, x, top, bottom = 1.0, thick = 0.6 }) {
    super(id, 'Low beam (slide)', x);
    const g = this.group;
    for (const z of [-1.75, 1.75]) g.add(woodPost(mats, x, z, -2.5, top + bottom + thick + 0.2, 0.16));
    const node = new THREE.Group();
    node.position.set(x, top + bottom + thick / 2, 0);
    g.add(node);
    const beam = pad(0.55, thick, 3.7, mats.padRed, 0.2);
    node.add(beam);
    for (const z of [-1, 0, 1]) {
      const s = pad(0.57, thick + 0.02, 0.25, mats.padWhite, 0.08);
      s.position.z = z * 0.9; node.add(s);
    }
    this.collide(box(node, V(0, 0, 0), V(0.275, thick / 2, 1.85)));
    shadowed(g);
    this.finish();
  }
}

export function boxDeckGeometry(len, thick, width) {
  return boxUV(new THREE.BoxGeometry(len, thick, width), 0.45);
}
