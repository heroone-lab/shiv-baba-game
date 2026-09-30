import * as THREE from 'three';
import { softDotTexture, ringTexture } from '../world/textures.js';

// Water splash spray, foam rings and finish confetti.
export class Particles {
  constructor(scene) {
    this.scene = scene;
    const N = 600;
    this.N = N;
    this.p = new Float32Array(N * 3);
    this.v = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.size = new Float32Array(N);
    this.col = new Float32Array(N * 3);
    this.kind = new Uint8Array(N); // 0 water, 1 confetti
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: softDotTexture() }, scale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute vec3 color; varying vec3 vColor; uniform float scale;
        void main() { vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map; varying vec3 vColor;
        void main() { vec4 t = texture2D(map, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vColor, t.a * 0.9); }`,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;

    this.rings = [];
    const rt = ringTexture();
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, opacity: 0 }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.rings.push({ m, t: 99 });
    }
    this.ringIdx = 0;
  }

  emit(x, y, z, vx, vy, vz, life, size, r, g, b, kind = 0) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.N;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3);
    this.col.set([r, g, b], i * 3);
    this.life[i] = life; this.size[i] = size; this.kind[i] = kind;
  }

  splash(pos, strength = 1) {
    const n = Math.floor(90 + strength * 60);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random() * 3.2) * strength;
      const up = (3 + Math.random() * 7) * (0.6 + strength * 0.5);
      const w = 0.85 + Math.random() * 0.15;
      this.emit(pos.x + Math.cos(a) * 0.3, 0.05, pos.z + Math.sin(a) * 0.3, Math.cos(a) * s, up, Math.sin(a) * s,
        0.8 + Math.random() * 0.8, 0.08 + Math.random() * 0.16, w, w + 0.05, 1.0);
    }
    for (let k = 0; k < 2; k++) {
      const r = this.rings[this.ringIdx]; this.ringIdx = (this.ringIdx + 1) % this.rings.length;
      r.t = -k * 0.25; r.m.position.set(pos.x, 0.03, pos.z); r.m.visible = true; r.max = 4 + strength * 2;
    }
  }

  confetti(x, y, z) {
    const cols = [[1, 0.2, 0.15], [1, 0.8, 0.1], [0.1, 0.5, 1], [0.2, 0.9, 0.4], [1, 1, 1]];
    for (let i = 0; i < 220; i++) {
      const c = cols[i % cols.length];
      this.emit(x + (Math.random() - 0.5) * 4, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 5, 5 + Math.random() * 7, (Math.random() - 0.5) * 5, 2.5 + Math.random() * 2, 0.07 + Math.random() * 0.05, ...c, 1);
    }
  }

  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const conf = this.kind[i] === 1;
      const drag = conf ? 2.2 : 0.3;
      this.v[i * 3 + 1] -= (conf ? 6 : 18) * dt;
      for (let k = 0; k < 3; k++) { this.v[i * 3 + k] *= Math.exp(-drag * dt); this.p[i * 3 + k] += this.v[i * 3 + k] * dt; }
      if (!conf && this.p[i * 3 + 1] < 0 && this.v[i * 3 + 1] < 0) this.life[i] = 0;
      if (this.life[i] < 0.3) this.size[i] *= 0.9;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    for (const r of this.rings) {
      if (!r.m.visible) continue;
      r.t += dt;
      if (r.t < 0) continue;
      const u = r.t / 1.6;
      if (u >= 1) { r.m.visible = false; continue; }
      const s = 0.8 + u * r.max;
      r.m.scale.set(s, s, 1);
      r.m.material.opacity = (1 - u) * 0.8;
    }
  }
}
