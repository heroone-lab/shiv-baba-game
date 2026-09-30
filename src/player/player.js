import * as THREE from 'three';
import { PHYS, WATER_Y, RESPAWN_INVULN } from '../config.js';
import { testCapsule, pointVelocity } from '../collision.js';

const approach = (v, target, maxDelta) => (v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target));
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _sv = new THREE.Vector3();

/**
 * Player controller.
 * States: frozen | ground | air | slide | hit | water | victory
 * Physics is a 2.5D side-scroller on the z=0 lane; z is only used when an
 * obstacle knocks the runner sideways off the deck.
 */
export class Player {
  constructor(character, course, events = {}) {
    this.char = character;
    this.course = course;
    this.events = events;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.state = 'frozen';
    this.stateT = 0;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpCut = false;
    this.slideT = 0;
    this.invuln = 0;
    this.dir = 1;
    this.maxX = 0;
    this.lastHit = null;
    this.spin = 0;
  }

  get root() { return this.char.root; }

  setState(s) { this.state = s; this.stateT = 0; }

  respawn(cp) {
    this.pos.set(cp.x, cp.y, 0);
    this.vel.set(0, 0, 0);
    this.grounded = true;
    this.setState('ground');
    this.invuln = RESPAWN_INVULN;
    this.dir = 1;
    this.spin = 0;
    this.char.root.rotation.set(0, 0, 0);
    this.char.yaw = Math.PI / 2;
    this.char.pivot.rotation.y = this.char.yaw;
    this.char.play('Idle', { fade: 0.05 });
    this.sync();
  }

  freeze() { this.setState('frozen'); this.vel.set(0, 0, 0); this.char.play('Idle'); }
  release() { if (this.state === 'frozen') this.setState('ground'); }

  capsuleHeight() { return this.state === 'slide' ? PHYS.slideHeight : PHYS.height; }

  update(dt, input) {
    this.stateT += dt;
    this.invuln -= dt;
    const s = this.state;

    if (s === 'frozen') { this.char.play('Idle'); this.finishFrame(dt); return; }
    if (s === 'water') { this.updateWater(dt); this.finishFrame(dt); return; }
    if (s === 'victory') {
      this.vel.x = approach(this.vel.x, 0, PHYS.groundDecel * dt);
      this.pos.x += this.vel.x * dt;
      this.char.faceYaw(0.25, dt, 4);
      this.finishFrame(dt);
      return;
    }

    const controlled = s === 'ground' || s === 'air' || s === 'slide';
    if (controlled) this.control(dt, input);

    // gravity + integration with sub-steps so fast bodies do not tunnel through decks
    this.vel.y = Math.max(this.vel.y - PHYS.gravity * dt, -PHYS.maxFall);
    const steps = Math.max(1, Math.ceil((this.vel.length() * dt) / 0.12));
    const h = dt / steps;
    const wasGrounded = this.grounded;
    for (let i = 0; i < steps; i++) {
      this.pos.addScaledVector(this.vel, h);
      this.resolveDecks(wasGrounded);
    }

    if (controlled) this.afterMove(dt, wasGrounded);
    if (this.state === 'hit') this.updateHit(dt);

    if (controlled && this.invuln <= 0) this.collideObstacles(dt);

    if (this.pos.y < WATER_Y - 0.05) this.splash();

    if ((this.state === 'ground' || this.state === 'slide') && this.pos.x > this.maxX) this.maxX = this.pos.x;
    if (this.state === 'ground' && this.pos.x >= this.course.finishX) {
      this.setState('victory');
      this.char.play('Victory', { fade: 0.3, once: true });
      this.events.finish?.();
    }
    this.finishFrame(dt);
  }

  control(dt, input) {
    const move = input.move;
    if (Math.abs(move) > 0.1) this.dir = Math.sign(move);

    if (this.state === 'slide') {
      this.slideT -= dt;
      this.vel.x = approach(this.vel.x, 0, PHYS.slideFriction * dt);
      const blocked = this.headBlocked();
      if ((this.slideT <= 0 || Math.abs(this.vel.x) < 1.2) && !blocked) {
        this.setState('ground');
      } else if (blocked && Math.abs(this.vel.x) < 2.5) {
        this.vel.x = 2.5 * Math.sign(this.vel.x || 1); // keep scooting until clear
      }
    } else {
      const target = move * PHYS.runSpeed;
      const accel = this.grounded ? (Math.abs(move) > 0.1 ? PHYS.groundAccel : PHYS.groundDecel) : PHYS.airAccel;
      this.vel.x = approach(this.vel.x, target, accel * dt);
    }

    // jump with coyote time + input buffering
    this.jumpBuf = input.jumpPressed ? PHYS.jumpBuffer : this.jumpBuf - dt;
    this.coyote = this.grounded ? PHYS.coyoteTime : this.coyote - dt;
    if (this.jumpBuf > 0 && this.coyote > 0 && !(this.state === 'slide' && this.headBlocked())) {
      this.vel.y = PHYS.jumpVel;
      this.grounded = false;
      this.coyote = this.jumpBuf = 0;
      this.jumpCut = false;
      this.setState('air');
      this.char.play('RunningJump', { fade: 0.08, once: true, timeScale: 1.15 });
      this.events.jump?.();
    }
    if (this.state === 'air' && !input.jumpHeld && this.vel.y > 0 && !this.jumpCut) {
      this.vel.y *= PHYS.jumpCut;
      this.jumpCut = true;
    }

    if (input.slidePressed && this.grounded && this.state === 'ground' && Math.abs(this.vel.x) > PHYS.slideMinSpeed) {
      this.setState('slide');
      this.slideT = PHYS.slideTime;
      this.vel.x = Math.sign(this.vel.x) * Math.max(Math.abs(this.vel.x), PHYS.runSpeed) * 1.08;
      this.char.play('RunningSlide', { fade: 0.1, once: true, timeScale: 1.35, from: 0.08 });
      this.events.slide?.();
    }
  }

  afterMove(dt, wasGrounded) {
    if (this.grounded && this.state === 'air') {
      this.setState('ground');
      this.events.land?.(this.landSpeed);
    } else if (!this.grounded && this.state === 'ground') {
      this.setState('air'); // ran off an edge
    } else if (!this.grounded && this.state === 'slide') {
      this.setState('air');
    }

    if (this.state === 'ground') {
      const sp = Math.abs(this.vel.x);
      if (sp < 0.35) this.char.play('Idle', { fade: 0.25 });
      else if (sp < 2.6) this.char.play('Walking(1)', { fade: 0.2, timeScale: THREE.MathUtils.clamp(sp / 1.5, 0.8, 1.6) });
      else this.char.play('FastRun', { fade: 0.16, timeScale: THREE.MathUtils.clamp(sp / 7.0, 0.75, 1.15) });
    } else if (this.state === 'air') {
      const deckY = this.course.supportAt(this.pos.x, 0)?.topAt(this.pos.x) ?? 0;
      if (this.vel.y < -7 && (this.char.currentName !== 'RunningJump' || this.char.progress() > 0.8 || this.pos.y < deckY - 0.3)) {
        this.char.play('FallingIdle', { fade: 0.3 });
      }
    }
    if (this.state !== 'slide') this.char.face(this.dir, dt);
  }

  headBlocked() {
    // is there an obstacle directly above a sliding runner?
    _a.set(this.pos.x, this.pos.y + PHYS.radius + 0.1, 0);
    _b.set(this.pos.x, this.pos.y + PHYS.height - PHYS.radius, 0);
    for (const o of this.course.obstaclesNear(this.pos.x, 3)) {
      if (o.id !== 'SL') continue;
      for (const c of o.colliders) if (testCapsule(_a, _b, PHYS.radius, c)) return true;
    }
    return false;
  }

  resolveDecks(wasGrounded) {
    const p = this.pos, r = PHYS.radius;
    this.grounded = false;
    if (Math.abs(p.z) > 1.25) return; // knocked off the deck: nothing below but water
    const hgt = this.capsuleHeight();
    for (const d of this.course.platforms) {
      // vertical faces at deck ends
      const bottom = Math.min(d.t0, d.t1) - d.thick;
      if (p.y + hgt > bottom) {
        const topL = d.t0, topR = d.t1;
        if (p.x < d.x0 && p.x + r > d.x0 && p.y < topL - PHYS.stepHeight) { p.x = d.x0 - r; if (this.vel.x > 0) this.vel.x = 0; }
        if (p.x > d.x1 && p.x - r < d.x1 && p.y < topR - PHYS.stepHeight) { p.x = d.x1 + r; if (this.vel.x < 0) this.vel.x = 0; }
      }
      // head bump under a deck
      if (this.vel.y > 0 && p.x > d.x0 && p.x < d.x1 && p.y < bottom && p.y + hgt > bottom) { p.y = bottom - hgt; this.vel.y = 0; }
    }
    if (this.state === 'hit') return;
    const d = this.course.supportAt(p.x, p.z);
    if (!d) return;
    const top = d.topAt(p.x);
    const snap = wasGrounded ? 0.3 : 0.02; // stick to ramps when walking down
    if (this.vel.y <= 0 && p.y <= top + snap && p.y >= top - 0.5) {
      this.landSpeed = -this.vel.y;
      p.y = top;
      this.vel.y = 0;
      this.grounded = true;
    }
  }

  collideObstacles(dt) {
    const hgt = this.capsuleHeight(), r = PHYS.radius;
    _a.set(this.pos.x, this.pos.y + r, this.pos.z);
    _b.set(this.pos.x, this.pos.y + hgt - r, this.pos.z);
    for (const o of this.course.obstaclesNear(this.pos.x, 7)) {
      for (const c of o.colliders) {
        const res = testCapsule(_a, _b, r, c);
        if (!res || res.depth < 0.015) continue;
        const sv = pointVelocity(c.node, c.node.userData.prev, res.point, dt, _sv);
        // landing on top of padding = bounce, anything else knocks you off
        if (res.normal.y > 0.65 && this.vel.y <= 0.5) {
          this.pos.addScaledVector(res.normal, res.depth);
          this.vel.y = 7 + Math.max(0, sv.y) * 0.5;
          this.vel.x += sv.x * 0.5;
          this.setState('air');
          this.events.bounce?.();
          return;
        }
        this.hit(res, sv.clone(), o);
        return;
      }
    }
  }

  hit(res, sv, obstacle) {
    const n = res.normal;
    this.setState('hit');
    this.lastHit = obstacle.id;
    this.grounded = false;
    const force = Math.min(sv.length(), 12);
    this.vel.x = THREE.MathUtils.clamp(sv.x * 1.05 + n.x * 5.5, -12, 12);
    this.vel.y = THREE.MathUtils.clamp(4.6 + Math.max(0, sv.y) * 0.6 + Math.max(0, n.y) * 3, 4.6, 11);
    let side = Math.abs(n.z) > 0.35 ? Math.sign(n.z) : Math.abs(sv.z) > 1 ? Math.sign(sv.z) : 1;
    this.vel.z = side * THREE.MathUtils.clamp(4 + Math.abs(sv.z) * 0.45, 4, 9);
    this.spin = THREE.MathUtils.clamp((sv.x + n.x * 3) * 0.6, -6, 6);
    // pick a reaction that matches the push direction
    const back = this.vel.x * this.dir < -1;
    const anim = back ? 'FlyingBackDeath' : res.point.y < this.pos.y + 0.7 ? 'Tripping' : 'SweepFall';
    this.char.play(anim, { fade: 0.08, once: true, timeScale: 1.25 });
    this.events.hit?.(obstacle, force + 5, res.point);
  }

  updateHit(dt) {
    // tumble a little while flying toward the water
    this.char.root.rotation.z += this.spin * 0.12 * dt;
    if (this.stateT > 0.75 && this.vel.y < 0) this.char.play('FallingIdle', { fade: 0.4 });
  }

  splash() {
    const speed = this.vel.length();
    this.setState('water');
    this.vel.multiplyScalar(0.15);
    this.pos.y = WATER_Y - 0.05;
    this.char.play('TreadingWater', { fade: 0.35 });
    this.events.splash?.(this.pos.clone(), speed);
  }

  updateWater(dt) {
    const t = this.stateT;
    // plunge, then bob up to treading depth (head above water)
    const target = t < 0.35 ? -1.9 : -1.4 + Math.sin(t * 2.4) * 0.05;
    this.pos.y += (target - this.pos.y) * Math.min(1, dt * (t < 0.35 ? 9 : 3));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.vel.multiplyScalar(Math.exp(-dt * 2.5));
    this.char.root.rotation.z *= Math.exp(-dt * 6);
    this.char.faceYaw(0.4, dt, 3);
    if (t > 1.9 && !this.reported) { this.reported = true; this.events.drowned?.(); }
  }

  finishFrame(dt) {
    if (this.state !== 'water') this.reported = false;
    this.sync();
    this.char.update(dt);
  }

  sync() { this.char.root.position.copy(this.pos); }
}
