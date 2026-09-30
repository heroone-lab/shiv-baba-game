import * as THREE from 'three';

// Wraps the user's Mixamo character: scale to metres, feet on origin,
// face +X, remove root motion, and provide cross-faded clip playback.

// Clips whose hips may not rise above the start height (physics owns the jump arc).
const AIRBORNE = new Set(['RunningJump', 'RunningJump(1)', 'BigJump', 'Jumping', 'FallingIdle']);

export class Character {
  constructor(gltf) {
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.root.add(this.pivot);

    const model = gltf.scene;
    model.scale.setScalar(0.01); // centimetres -> metres
    this.pivot.add(model);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material;
        // exported with metalness 0.5 which made cloth look like foil
        m.metalness = 0;
        m.roughness = m.name.includes('eyelash') ? 0.9 : 0.72;
        m.envMapIntensity = 1.0;
        if (m.map) m.map.anisotropy = 8;
      }
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    model.position.y = -box.min.y;
    this.height = box.max.y - box.min.y;
    this.pivot.rotation.y = Math.PI / 2; // model faces +Z; the course runs +X
    this.yaw = Math.PI / 2;

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of gltf.animations) {
      if (!clip.tracks.length || clip.duration < 0.1) continue;
      const c = clip.clone();
      for (const tr of c.tracks) {
        if (!tr.name.endsWith('.position')) continue;
        const v = tr.values;
        const x0 = v[0], y0 = v[1], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) {
          v[i] = x0; v[i + 2] = z0; // strip horizontal root motion
          if (AIRBORNE.has(c.name)) v[i + 1] = Math.min(v[i + 1], y0);
        }
      }
      this.actions[c.name] = this.mixer.clipAction(c);
      // The pack has no idle clip; the first ~0.9 s of "Defeated" is a relaxed stand.
      if (c.name === 'Defeated') {
        const idle = THREE.AnimationUtils.subclip(c, 'Idle', 0, 54, 60);
        this.actions.Idle = this.mixer.clipAction(idle);
        this.idlePingPong = true;
      }
    }
    this.current = null;
    this.currentName = '';
  }

  has(name) { return !!this.actions[name]; }

  play(name, { fade = 0.18, once = false, timeScale = 1, from = 0 } = {}) {
    const next = this.actions[name];
    if (!next) return;
    if (this.currentName === name) { next.setEffectiveTimeScale(timeScale); return; }
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : name === 'Idle' ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.time = from * next.getClip().duration;
    next.setEffectiveTimeScale(timeScale);
    next.setEffectiveWeight(1);
    next.enabled = true;
    next.play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    else next.fadeIn(fade);
    this.current = next;
    this.currentName = name;
  }

  setTimeScale(ts) { if (this.current) this.current.setEffectiveTimeScale(ts); }

  /** normalized progress 0..1 of the current clip */
  progress() {
    if (!this.current) return 0;
    return this.current.time / this.current.getClip().duration;
  }

  face(dir, dt, speed = 12) { this.faceYaw(dir >= 0 ? Math.PI / 2 : -Math.PI / 2, dt, speed); }

  faceYaw(target, dt, speed = 12) {
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * speed);
    this.pivot.rotation.y = this.yaw;
  }

  update(dt) { this.mixer.update(dt); }
}
