import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Character } from './character.js';

// "Your Opponent": your own best finished run, replayed as a translucent runner.
// Recorded at 15 Hz (position + animation), stored per round in localStorage.

const HZ = 15;
const KEY = (id) => `sb_ghost_${id}`;

export class GhostRecorder {
  constructor() { this.reset(); }
  reset() { this.frames = []; this.anims = []; this.acc = 0; }
  sample(dt, player) {
    this.acc += dt;
    while (this.acc >= 1 / HZ) {
      this.acc -= 1 / HZ;
      const p = player.pos;
      const name = player.char.currentName || 'Idle';
      let a = this.anims.indexOf(name);
      if (a < 0) { this.anims.push(name); a = this.anims.length - 1; }
      this.frames.push(Math.round(p.x * 100), Math.round(p.y * 100), Math.round(p.z * 100), player.dir > 0 ? 1 : 0, a);
    }
  }
  save(id, time) {
    try { localStorage.setItem(KEY(id), JSON.stringify({ v: 1, hz: HZ, time, anims: this.anims, f: this.frames })); } catch { /* storage full: skip */ }
  }
}

export function loadGhost(id) {
  try {
    const g = JSON.parse(localStorage.getItem(KEY(id)) || 'null');
    return g && g.v === 1 && g.f?.length ? g : null;
  } catch { return null; }
}

export class GhostRunner {
  constructor(heroGltf, scene) {
    const gltf = { scene: cloneSkinned(heroGltf.scene), animations: heroGltf.animations };
    this.char = new Character(gltf);
    this.char.root.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material.clone();
      m.transparent = true;
      m.opacity = 0.42;
      m.color = new THREE.Color(0x9fd8ff);
      m.emissive = new THREE.Color(0x1a5a9a);
      m.emissiveIntensity = 0.6;
      m.depthWrite = true;
      o.material = m;
      o.castShadow = false;
      o.renderOrder = 2;
    });
    this.char.root.visible = false;
    scene.add(this.char.root);
    this.data = null;
    this.t = 0;
    this.pos = new THREE.Vector3();
    this.done = false;
  }

  setRun(data) { this.data = data; this.t = 0; this.done = false; this.char.root.visible = !!data; }

  get active() { return !!this.data; }

  /** z offset keeps the ghost beside the runner instead of inside them */
  update(dt, running) {
    if (!this.data) return;
    if (running) this.t += dt;
    const f = this.data.f, n = f.length / 5;
    const u = this.t * this.data.hz;
    const i = Math.min(n - 1, Math.floor(u)), j = Math.min(n - 1, i + 1), k = Math.min(1, u - i);
    const at = (idx, c) => f[idx * 5 + c] / 100;
    this.pos.set(
      THREE.MathUtils.lerp(at(i, 0), at(j, 0), k),
      THREE.MathUtils.lerp(at(i, 1), at(j, 1), k),
      THREE.MathUtils.lerp(at(i, 2), at(j, 2), k) - 0.55,
    );
    this.done = i >= n - 1;
    this.char.root.position.copy(this.pos);
    const anim = this.data.anims[f[i * 5 + 4]];
    if (anim && anim !== 'Victory') this.char.play(anim, { fade: 0.2 });
    else if (this.done) this.char.play('Idle', { fade: 0.3 });
    this.char.face(f[i * 5 + 3] ? 1 : -1, dt, 8);
    this.char.update(running ? dt : 0);
  }

  hide() { this.char.root.visible = false; }
}
