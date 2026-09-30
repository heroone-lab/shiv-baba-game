import * as THREE from 'three';
import { Obstacle, V, pad, shadowed, steelPost } from './obstacles.js';
import { box, sphere, capsule } from '../collision.js';

// Episode 6 (Grand Finale, night) obstacles: lasers, flames, tesla arcs, meteors,
// drones, pop-up bollards, a saw on a track, a wind fan, a trampoline and fire hoops.
// All motion runs on the course clock, so every attempt has identical timing.

const TAU = Math.PI * 2;
const cyc = (t, per, ph = 0) => ((((t + ph) % per) + per) % per) / per;
const smooth = (u) => u * u * (3 - 2 * u);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
const N = (mats, k) => mats.t?.[k] || mats.padRed;

/** Obstacle whose colliders switch on and off (lasers, flames, arcs). */
class Toggled extends Obstacle {
  get noBounce() { return true; }
  setOn(on) { this.colliders = on ? this.allCols : []; }
  savePrev() { for (const c of this.allCols || this.colliders) c.node.userData.prev.copy(c.node.matrixWorld); }
  collideAll() { this.allCols = [...this.colliders]; }
}

// ------------------------------------------------------------------ Laser gate
/** Laser beam across the lane, blinking on/off. low = jump it, high = slide under it. */
export class LaserGate extends Toggled {
  constructor(mats, { id, x, top, h = 0.45, period = 2.4, on = 0.55, phase = 0, color = 'red' }) {
    super(id, h < 0.9 ? 'Low laser (jump)' : 'High laser (slide)', x);
    Object.assign(this, { period, onFrac: on, phase });
    const g = this.group, y = top + h;
    for (const z of [-1.55, 1.45]) {
      g.add(mesh(new THREE.BoxGeometry(0.22, h + 0.5, 0.22), N(mats, 'carbon'), x, top + (h + 0.5) / 2, z));
      g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), N(mats, color), x, y, z));
    }
    const beamNode = new THREE.Group(); beamNode.position.set(x, y, 0); g.add(beamNode); this.beamNode = beamNode;
    const beam = mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.0, 8), N(mats, 'laser')); beam.rotation.x = Math.PI / 2; beamNode.add(beam);
    const halo = mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.0, 8), N(mats, 'laser')); halo.rotation.x = Math.PI / 2; halo.material = halo.material.clone(); halo.material.opacity = 0.25; beamNode.add(halo);
    this.dynamicNodes = [beamNode];
    this.collide(capsule(beamNode, V(0, 0, -1.4), V(0, 0, 1.4), 0.07));
    this.collideAll();
    shadowed(g); beam.castShadow = halo.castShadow = false;
    this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase);
    const on = u < this.onFrac;
    const warn = !on && u > 0.88; // flicker just before it comes back on
    this.setOn(on);
    this.beamNode.visible = on || (warn && Math.floor(t * 20) % 2 === 0);
  }
}

/** Two beams: a low one and a high one, alternating (jump, then slide). */
export class LaserGrid extends Obstacle {
  constructor(mats, opts) {
    super(opts.id, 'Laser grid', opts.x);
    this.noBounce = true;
    this.low = new LaserGate(mats, { ...opts, id: opts.id + 'a', x: opts.x - 1.4, h: 0.4, period: opts.period ?? 2.6, on: 0.5, phase: 0 });
    this.high = new LaserGate(mats, { ...opts, id: opts.id + 'b', x: opts.x + 1.4, h: 1.2, period: opts.period ?? 2.6, on: 0.5, phase: (opts.period ?? 2.6) * 0.5, color: 'pink' });
    this.group.add(this.low.group, this.high.group);
    this.colliders = [];
  }
  savePrev() { this.low.savePrev(); this.high.savePrev(); }
  update(t) { this.low.update(t); this.high.update(t); this.colliders = [...this.low.colliders, ...this.high.colliders]; }
}

// ------------------------------------------------------------------ Laser spinner
/**
 * Laser "clock hand": one beam turning in the camera plane from an emitter above the lane.
 * Pointing down it sweeps the deck (jump it); sideways or up it is over your head.
 */
export class LaserSpinner extends Obstacle {
  constructor(mats, { id, x, top, h = 2.55, len = 2.35, speed = 1.2, phase = 0 }) {
    super(id, 'Laser spinner', x);
    this.noBounce = true;
    this.speed = speed; this.phase = phase;
    const g = this.group;
    g.add(steelPost(mats, x, -1.9, top - 0.1, top + h, 0.16));
    const rot = new THREE.Group(); rot.position.set(x, top + h, 0); g.add(rot); this.rot = rot;
    const hub = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 16), N(mats, 'carbon'), 0, 0, -1.15); hub.rotation.x = Math.PI / 2; rot.add(hub);
    rot.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), N(mats, 'red')));
    const beam = mesh(new THREE.BoxGeometry(len, 0.08, 0.08), N(mats, 'laser'), len / 2, 0, 0); rot.add(beam);
    const glow = mesh(new THREE.BoxGeometry(len, 0.24, 0.24), N(mats, 'laser'), len / 2, 0, 0); glow.material = glow.material.clone(); glow.material.opacity = 0.22; rot.add(glow);
    this.collide(box(rot, V(len / 2 + 0.1, 0, 0), V(len / 2 - 0.1, 0.07, 0.3)));
    shadowed(g); beam.castShadow = glow.castShadow = false;
    this.finish();
  }
  update(t) { this.rot.rotation.z = -(this.speed * t) + this.phase; }
}

// ------------------------------------------------------------------ Flame jets
/** Three vents in the deck that burst into flame columns. */
export class FlameJets extends Toggled {
  constructor(mats, { id, x, top, period = 2.6, on = 0.4, phase = 0, span = 1.4 }) {
    super(id, 'Flame jets', x);
    Object.assign(this, { period, onFrac: on, phase });
    const g = this.group;
    this.flames = [];
    for (const dx of [-span / 2, 0, span / 2]) {
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 16), N(mats, 'carbon'), x + dx, top + 0.06, 0));
      g.add(mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 20), N(mats, 'gold'), x + dx, top + 0.12, 0)).children;
      g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      const f = new THREE.Group(); f.position.set(x + dx, top + 0.1, 0); g.add(f);
      const outer = mesh(new THREE.ConeGeometry(0.34, 2.3, 12, 1, true), N(mats, 'fire'), 0, 1.15); f.add(outer);
      const inner = mesh(new THREE.ConeGeometry(0.18, 1.6, 10, 1, true), N(mats, 'fire'), 0, 0.8); inner.material = inner.material.clone(); inner.material.color.set(0xffe08a); f.add(inner);
      this.flames.push(f);
    }
    this.dynamicNodes = this.flames;
    const node = new THREE.Group(); node.position.set(x, top, 0); g.add(node);
    this.collide(box(node, V(0, 1.0, 0), V(span / 2 + 0.28, 1.0, 0.36)));
    this.collideAll();
    this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase);
    const on = u < this.onFrac;
    this.setOn(on);
    const pre = u > 0.9; // sputter before a burst
    this.flames.forEach((f, i) => {
      f.visible = on || pre;
      const s = on ? 0.9 + 0.15 * Math.sin(t * 30 + i) : 0.18;
      f.scale.set(on ? 1 : 0.6, s, on ? 1 : 0.6);
    });
  }
}

// ------------------------------------------------------------------ Tesla gate
/** Two coils; a crackling arc fills the lane while they fire. Pass while they recharge. */
export class TeslaGate extends Toggled {
  constructor(mats, { id, x, top, period = 2.8, on = 0.45, phase = 0 }) {
    super(id, 'Tesla gate', x);
    Object.assign(this, { period, onFrac: on, phase });
    const g = this.group;
    for (const z of [-1.6, 1.5]) {
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 12), N(mats, 'carbon'), x, top + 1.1, z));
      for (let k = 0; k < 4; k++) g.add(mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), N(mats, 'violet'), x, top + 0.8 + k * 0.35, z)).children;
      g.add(mesh(new THREE.SphereGeometry(0.28, 16, 12), N(mats, 'white'), x, top + 2.3, z));
    }
    g.traverse((o) => { if (o.geometry?.type === 'TorusGeometry') o.rotation.x = Math.PI / 2; });
    const arcs = new THREE.Group(); arcs.position.set(x, top, 0); g.add(arcs); this.arcs = arcs;
    this.bolts = [];
    for (let k = 0; k < 3; k++) {
      const pts = Array.from({ length: 10 }, (_, i) => new THREE.Vector3(0, 0, -1.6 + (3.1 * i) / 9));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
      arcs.add(line); this.bolts.push({ line, y: 0.5 + k * 0.6 });
    }
    const sheet = mesh(new THREE.PlaneGeometry(0.1, 1), N(mats, 'arc')); sheet.visible = false; arcs.add(sheet);
    this.dynamicNodes = [arcs];
    this.collide(box(arcs, V(0, 1.1, 0), V(0.3, 1.1, 1.4)));
    this.collideAll();
    this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase);
    const on = u < this.onFrac;
    this.setOn(on);
    this.arcs.visible = on || (u > 0.9 && Math.floor(t * 25) % 3 === 0);
    if (this.arcs.visible) for (const b of this.bolts) {
      const pos = b.line.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const k = i / (pos.count - 1), edge = Math.sin(k * Math.PI);
        pos.setX(i, (Math.sin(t * 90 + i * 7.3 + b.y * 10) * 0.18) * edge);
        pos.setY(i, b.y + Math.sin(t * 70 + i * 5.1 + b.y * 3) * 0.25 * edge);
      }
      pos.needsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------ Meteor
/** A glowing rock drops out of the sky onto a target ring, bursts, and fades away. */
export class Meteor extends Toggled {
  constructor(mats, { id, x, top, period = 3.0, phase = 0, r = 0.6 }) {
    super(id, 'Meteor drop', x);
    Object.assign(this, { period, phase, r, top });
    const g = this.group;
    const ring = mesh(new THREE.RingGeometry(r * 1.2, r * 1.5, 32), N(mats, 'red'), x, top + 0.01, 0); ring.rotation.x = -Math.PI / 2; g.add(ring); this.ring = ring;
    ring.material = ring.material.clone(); ring.material.transparent = true;
    const rock = new THREE.Group(); g.add(rock); this.rock = rock;
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.85 + ((i * 37) % 10) / 30), p.getY(i) * (0.85 + ((i * 53) % 10) / 30), p.getZ(i));
    geo.computeVertexNormals();
    rock.add(mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: 0xff4a10, emissiveIntensity: 1.4, roughness: 0.9, flatShading: true })));
    const tail = mesh(new THREE.ConeGeometry(r * 0.9, r * 5, 12, 1, true), N(mats, 'fire'), 0, r * 2.6); rock.add(tail); this.tail = tail;
    this.dynamicNodes = [rock, ring];
    this.collide(sphere(rock, V(0, 0, 0), r));
    this.collideAll();
    this.finish();
  }
  update(t) {
    const u = cyc(t, this.period, this.phase);
    const fallStart = 0.45, land = 0.72, gone = 0.86;
    let y, on = true;
    if (u < fallStart) { y = this.top + 30; on = false; }
    else if (u < land) { const k = (u - fallStart) / (land - fallStart); y = this.top + this.r + 30 * (1 - k * k); }
    else if (u < gone) { y = this.top + this.r - ((u - land) / (gone - land)) * this.r * 0.6; }
    else { y = this.top - 5; on = false; }
    this.rock.position.set(this.x, y, 0);
    this.rock.rotation.set(t * 3, t * 2, 0);
    this.tail.visible = u < land;
    this.setOn(on && y < this.top + 3.2);
    this.ring.visible = u > 0.25 && u < gone;
    this.ring.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 12));
  }
}

// ------------------------------------------------------------------ Drone
/** Hovering drone going up and down over the lane: run under it when high, jump it when low. */
export class Drone extends Obstacle {
  constructor(mats, { id, x, top, low = 0.35, high = 2.2, period = 2.8, phase = 0 }) {
    super(id, 'Patrol drone', x);
    Object.assign(this, { low, high, period, phase, top });
    const g = this.group;
    const d = new THREE.Group(); g.add(d); this.mover = d;
    d.add(pad(1.1, 0.34, 1.1, N(mats, 'carbon'), 0.12));
    d.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), N(mats, 'red'), 0.56, 0, 0));
    this.props = [];
    for (const [ax, az] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      d.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), N(mats, 'carbon'), ax, 0.2, az));
      const prop = mesh(new THREE.BoxGeometry(0.9, 0.02, 0.08), N(mats, 'cyan'), ax, 0.3, az); d.add(prop); this.props.push(prop);
    }
    d.add(mesh(new THREE.BoxGeometry(1.14, 0.05, 1.14), N(mats, 'cyan'), 0, -0.17, 0));
    this.collide(box(d, V(0, 0, 0), V(0.6, 0.22, 0.6)));
    shadowed(g); this.finish();
  }
  update(t) {
    const s = 0.5 - 0.5 * Math.cos(TAU * cyc(t, this.period, this.phase));
    this.mover.position.set(this.x, this.top + this.low + (this.high - this.low) * s + 0.2, 0);
    this.mover.rotation.z = Math.sin(t * 2) * 0.06;
    for (const p of this.props) p.rotation.y = t * 40;
  }
}

// ------------------------------------------------------------------ Pop-up bollards
/** Three posts shooting up out of the deck one after another (a wave rolling toward you). */
export class Bollards extends Obstacle {
  constructor(mats, { id, x, top, period = 2.4, phase = 0, gap = 1.25, h = 1.05 }) {
    super(id, 'Pop-up bollards', x);
    Object.assign(this, { period, phase, h, top });
    const g = this.group;
    this.posts = [];
    [-gap, 0, gap].forEach((dx, i) => {
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), N(mats, 'carbon'), x + dx, top + 0.02, 0));
      const node = new THREE.Group(); node.position.set(x + dx, top - h, 0); g.add(node);
      node.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, h, 18), N(mats, 'padGold'), 0, h / 2));
      node.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 18), N(mats, 'cyan'), 0, h - 0.05));
      this.collide(box(node, V(0, h / 2, 0), V(0.3, h / 2, 0.3)));
      this.posts.push({ node, lag: (2 - i) * 0.12 });
    });
    this.dynamicNodes = this.posts.map((p) => p.node);
    shadowed(g); this.finish();
  }
  update(t) {
    for (const p of this.posts) {
      const u = cyc(t, this.period, this.phase + p.lag * this.period);
      let s = 0;
      if (u < 0.1) s = smooth(u / 0.1); else if (u < 0.42) s = 1; else if (u < 0.52) s = 1 - smooth((u - 0.42) / 0.1);
      p.node.position.y = this.top - this.h + (this.h + 0.02) * s;
    }
  }
}

// ------------------------------------------------------------------ Saw on a track
/** Spinning saw blade rolling back and forth along the lane: jump it as it comes. */
export class SawTrack extends Obstacle {
  constructor(mats, { id, x, top, span = 2.6, period = 2.4, phase = 0, r = 0.5 }) {
    super(id, 'Saw track', x);
    this.noBounce = true;
    Object.assign(this, { span, period, phase, r, top });
    const g = this.group;
    g.add(mesh(new THREE.BoxGeometry(span * 2 + 1.2, 0.05, 0.16), N(mats, 'red'), x, top + 0.025, 0));
    const saw = new THREE.Group(); g.add(saw); this.mover = saw;
    const blade = mesh(new THREE.CylinderGeometry(r, r, 0.06, 32), N(mats, 'white')); blade.rotation.x = Math.PI / 2; saw.add(blade);
    for (let k = 0; k < 16; k++) {
      const tooth = mesh(new THREE.ConeGeometry(0.07, 0.16, 4), N(mats, 'white'));
      const a = (k / 16) * TAU; tooth.position.set(Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05), 0); tooth.rotation.z = a - Math.PI / 2; saw.add(tooth);
    }
    saw.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), N(mats, 'pink'))).children;
    saw.children[saw.children.length - 1].rotation.x = Math.PI / 2;
    this.collide(sphere(saw, V(0, 0, 0), r + 0.05));
    shadowed(g); this.finish();
  }
  update(t) {
    const s = Math.sin(TAU * cyc(t, this.period, this.phase));
    const x = this.x + this.span * s;
    this.mover.position.set(x, this.top + this.r + 0.02, 0);
    this.mover.rotation.z = -x / this.r;
  }
}

// ------------------------------------------------------------------ Wind fan
/** Giant fan that blows runners backwards in gusts. Jump the next gap between gusts. */
export class WindFan extends Obstacle {
  constructor(mats, { id, x, top, period = 3.0, on = 0.5, phase = 0, reach = 7, strength = 26 }) {
    super(id, 'Wind fan', x);
    Object.assign(this, { period, onFrac: on, phase, reach, strength });
    const g = this.group;
    g.add(steelPost(mats, x, -2.2, top - 0.1, top + 1.6, 0.22));
    const housing = mesh(new THREE.TorusGeometry(1.25, 0.14, 10, 40), N(mats, 'carbon'), x, top + 1.5, -1.7); housing.rotation.y = Math.PI / 2; g.add(housing);
    const glow = mesh(new THREE.TorusGeometry(1.25, 0.04, 6, 40), N(mats, 'cyan'), x - 0.14, top + 1.5, -1.7); glow.rotation.y = Math.PI / 2; g.add(glow);
    const rot = new THREE.Group(); rot.position.set(x, top + 1.5, -1.7); g.add(rot); this.rot = rot;
    for (let k = 0; k < 5; k++) {
      const b = mesh(new THREE.BoxGeometry(0.06, 1.05, 0.34), N(mats, 'carbon'), 0, 0.55, 0);
      const arm = new THREE.Group(); arm.rotation.x = (k / 5) * TAU; arm.add(b); b.rotation.y = 0.5; rot.add(arm);
    }
    // gust streaks
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    this.streaks = [];
    for (let k = 0; k < 10; k++) { const s = mesh(new THREE.BoxGeometry(1.2, 0.02, 0.02), streakMat); g.add(s); this.streaks.push({ s, k }); }
    this.dynamicNodes = this.streaks.map((o) => o.s);
    this.colliders = [];
    this.top = top;
    this.finish();
  }
  blowing(t) { return cyc(t, this.period, this.phase) < this.onFrac; }
  /** backward acceleration at x (m/s²), 0 when calm */
  windAt(x, t) {
    if (!this.blowing(t) || x > this.x + 0.5 || x < this.x - this.reach) return 0;
    return this.strength;
  }
  update(t) {
    const on = this.blowing(t);
    this.rot.rotation.x = t * (on ? 22 : 3);
    for (const { s, k } of this.streaks) {
      s.visible = on;
      const u = ((t * 2.2 + k * 0.37) % 1);
      s.position.set(this.x - u * this.reach, this.top + 0.3 + ((k * 0.61) % 1) * 2.2, ((k * 0.37) % 1) * 2 - 1);
    }
  }
}

// ------------------------------------------------------------------ Trampoline
/** Glowing trampoline in a water gap: land on it to bounce up to a high platform. */
export class Trampoline extends Obstacle {
  constructor(mats, { id, x, top, w = 2.2, power = 13.5 }) {
    super(id, 'Trampoline', x);
    this.bounce = power;
    const g = this.group;
    const node = new THREE.Group(); node.position.set(x, top, 0); g.add(node);
    node.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.16, 32), N(mats, 'padPink'), 0, -0.08));
    const ring = mesh(new THREE.TorusGeometry(w / 2, 0.1, 10, 40), N(mats, 'cyan'), 0, 0); ring.rotation.x = Math.PI / 2; node.add(ring);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; node.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 12, 8), N(mats, 'carbon'), Math.cos(a) * w * 0.42, -6.1, Math.sin(a) * w * 0.42)); }
    this.collide(box(node, V(0, -0.1, 0), V(w / 2, 0.12, w / 2)));
    shadowed(g); this.finish();
  }
}

// ------------------------------------------------------------------ Fire hoop
/** Burning hoop bobbing up and down across the lane: hop through the middle. */
export class FireHoop extends Obstacle {
  constructor(mats, { id, x, top, r = 1.35, period = 2.6, phase = 0, bob = 0.3 }) {
    super(id, 'Fire hoop', x);
    this.noBounce = true;
    Object.assign(this, { period, phase, bob, top, r });
    const g = this.group;
    g.add(steelPost(mats, x, -2.0, top - 0.1, top + 2.8, 0.14));
    const node = new THREE.Group(); g.add(node); this.mover = node;
    const hoop = mesh(new THREE.TorusGeometry(r, 0.09, 10, 48), N(mats, 'gold')); hoop.rotation.y = Math.PI / 2; node.add(hoop);
    const flames = mesh(new THREE.TorusGeometry(r, 0.2, 8, 48), N(mats, 'fire')); flames.rotation.y = Math.PI / 2; node.add(flames); this.flames = flames;
    node.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 2.0 - r), N(mats, 'carbon'), 0, 0, -r - (2.0 - r) / 2));
    // ring = 12 small spheres around the circle (the middle is free)
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; this.collide(sphere(node, V(0, Math.sin(a) * r, Math.cos(a) * r), 0.16)); }
    shadowed(g); flames.castShadow = false;
    this.finish();
  }
  update(t) {
    const s = Math.sin(TAU * cyc(t, this.period, this.phase));
    this.mover.position.set(this.x, this.top + this.r + 0.25 + this.bob * s, 0);
    this.flames.scale.setScalar(1 + 0.06 * Math.sin(t * 25));
  }
}
