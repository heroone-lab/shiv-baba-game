import * as THREE from 'three';

// Side-on 2.5D follow camera with look-ahead toward the next obstacle,
// soft vertical follow (keeps the jump arc readable) and impact shake.
export class FollowCamera {
  constructor(camera) {
    this.cam = camera;
    this.focus = new THREE.Vector3(0, 2, 0);
    this.look = 0;
    this.shakeAmt = 0;
    this.shakeT = 0;
    this.mode = 'follow';
    this.cine = null;
  }

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  /** cinematic dolly across the course (round intro) */
  flyover(fromX, toX, duration) { this.cine = { fromX, toX, t: 0, duration }; }

  distance() {
    // portrait phones need to pull back to keep the course readable
    const a = this.cam.aspect;
    return a < 1 ? 9 + (1 - a) * 9 : a < 1.4 ? 9 : 8.2;
  }

  snap(player, course) { this.update(0, player, course, true); }

  update(dt, player, course, snap = false) {
    const cam = this.cam;
    const dist = this.distance();
    if (this.cine) {
      const c = this.cine;
      c.t += dt;
      const u = THREE.MathUtils.smootherstep(Math.min(c.t / c.duration, 1), 0, 1);
      const x = THREE.MathUtils.lerp(c.fromX, c.toX, u);
      cam.position.set(x - 4, 5.2 + Math.sin(u * Math.PI) * 2.5, dist + 6 - u * 4);
      cam.lookAt(x + 2, 1.8, 0);
      if (c.t >= c.duration) this.cine = null;
      this.focus.set(x, 2.4, 0);
      return;
    }

    const p = player.pos;
    const k = snap ? 1 : 1 - Math.exp(-dt * 4.5);
    // look ahead toward the next obstacle but never hide the runner
    const nextX = course.nextObstacleX(p.x);
    const toNext = THREE.MathUtils.clamp((nextX - p.x) * 0.25, 0, 2.2);
    const ahead = THREE.MathUtils.clamp(player.vel.x * 0.22, -1.5, 1.8) + toNext * (player.dir > 0 ? 1 : 0.3);
    this.look += (ahead - this.look) * (snap ? 1 : 1 - Math.exp(-dt * 2));

    const deck = course.supportAt(p.x, 0);
    const groundY = deck ? deck.topAt(p.x) : 1.4;
    // follow height: mostly the ground under the runner, some of the jump, and dip when falling in
    let fy = groundY + 1.1 + Math.max(0, p.y - groundY) * 0.35;
    if (player.state === 'water' || player.state === 'hit') fy = Math.max(0.6, Math.min(fy, p.y + 1.6));
    const tx = p.x + this.look;
    this.focus.x += (tx - this.focus.x) * k;
    this.focus.y += (fy - this.focus.y) * (snap ? 1 : 1 - Math.exp(-dt * 3));
    this.focus.z += ((player.state === 'hit' || player.state === 'water' ? p.z * 0.4 : 0) - this.focus.z) * k;

    cam.position.set(this.focus.x - 1.1, this.focus.y + 2.0, this.focus.z + dist);
    cam.lookAt(this.focus.x + 0.5, this.focus.y + 0.05, this.focus.z);

    if (this.shakeAmt > 0.001) {
      this.shakeT += dt * 40;
      const s = this.shakeAmt;
      cam.position.x += Math.sin(this.shakeT * 1.3) * s * 0.15;
      cam.position.y += Math.sin(this.shakeT * 1.7 + 1) * s * 0.12;
      this.shakeAmt *= Math.exp(-dt * 6);
    }
  }
}
