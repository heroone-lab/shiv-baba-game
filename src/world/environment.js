import * as THREE from 'three';
import { PoolWater } from './PoolWater.js';
import { boxUV } from './materials.js';
import { logoTexture, flagTexture, pirateFlagTexture } from './textures.js';
import { mergeStatic, noReflect } from './merge.js';
import { nightSkyTexture, themeFlagTexture, glowTexture } from './themeTextures.js';

// Deterministic pseudo random so the scenery is identical every run.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let f = 0, amp = 0.5;
  for (let i = 0; i < 4; i++) { f += amp * vnoise(x, y); x *= 2.03; y *= 2.03; amp *= 0.5; }
  return f;
}

const BANK_Z = -15; // far edge of the pool channel

export function terrainHeight(x, z) {
  const d = -z + BANK_Z; // distance behind the bank
  if (d < 0) return -2;
  const hills = THREE.MathUtils.smoothstep(d, 10, 70) * (10 + 16 * fbm(x * 0.012, z * 0.02));
  const bumps = THREE.MathUtils.smoothstep(d, 1, 12) * 1.2 * fbm(x * 0.08, z * 0.08);
  return 0.55 + hills + bumps;
}

export class Environment {
  constructor(renderer, scene, assets, mats, q) {
    this.scene = scene;
    this.flags = [];
    const rand = rng(7);

    // ---- sky & image based lighting
    const sky = assets.sky;
    sky.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = sky;
    scene.backgroundIntensity = 1.0;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(sky).texture;
    scene.environmentIntensity = 0.9;
    pmrem.dispose();
    scene.fog = new THREE.FogExp2(0xbfd6e6, 0.0055);
    this.renderer = renderer;
    this.day = { background: sky, environment: scene.environment, envI: 0.9, fog: 0xbfd6e6, fogD: 0.0055 };

    // ---- sun
    this.sunDir = new THREE.Vector3(-0.45, 0.78, 0.44).normalize();
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    const sc = sun.shadow.camera;
    sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.hemi = new THREE.HemisphereLight(0x6a8cff, 0x05070c, 0);
    scene.add(this.hemi);

    // ---- pool water
    this.water = new PoolWater({ width: 700, depth: 260, normals: assets.waterNormals, res: q.waterRes, sunDirection: this.sunDir });
    this.water.mesh.position.set(60, 0, -20);
    scene.add(this.water.mesh);

    this.staticGroup = new THREE.Group();
    scene.add(this.staticGroup);
    this.flagTime = { value: 0 };
    this.buildBank(mats);
    this.buildTerrain(mats);
    this.buildVegetation(assets, q, rand);
    this.buildFlags(rand);
    this.buildSignage();
    this.buildLaneFloats();
    mergeStatic(this.staticGroup, (o) => !o.userData.keep);
  }

  buildBank(mats) {
    // Pool coping: concrete lip with a glossy blue tile band down to the water.
    const len = 520;
    const coping = new THREE.Mesh(boxUV(new THREE.BoxGeometry(len, 0.35, 1.6), 0.5), mats.concrete);
    coping.position.set(60, 0.45, BANK_Z - 0.8);
    const tile = new THREE.Mesh(new THREE.BoxGeometry(len, 1.4, 0.2), mats.tile);
    tile.position.set(60, -0.4, BANK_Z + 0.02);
    coping.receiveShadow = tile.receiveShadow = true;
    this.staticGroup.add(coping, tile);
  }

  buildTerrain(mats) {
    const W = 560, D = 190, sx = 220, sz = 80;
    const geo = new THREE.PlaneGeometry(W, D, sx, sz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cx = 60, cz = BANK_Z - 1.6 - D / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx, z = pos.getZ(i) + cz;
      pos.setY(i, terrainHeight(x, z));
    }
    geo.computeVertexNormals();
    boxUV(geo, 0.12);
    const ground = new THREE.Mesh(geo, mats.grass);
    ground.position.set(cx, 0, cz);
    ground.receiveShadow = false; // far behind the bank, outside the shadow frustum anyway
    this.staticGroup.add(ground);
  }

  buildVegetation(assets, q, rand) {
    const place = (gltf, count, zMin, zMax, sMin, sMax, xMin = -40, xMax = 170) => {
      const meshes = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      const mats = [];
      for (let i = 0; i < count; i++) {
        const x = xMin + rand() * (xMax - xMin);
        const z = zMin + rand() * (zMax - zMin);
        const s = sMin + rand() * (sMax - sMin);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, terrainHeight(x, z) - 0.1, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
          new THREE.Vector3(s, s, s),
        );
        mats.push(m);
      }
      for (const src of meshes) {
        const inst = new THREE.InstancedMesh(src.geometry, src.material, count);
        for (let i = 0; i < count; i++) inst.setMatrixAt(i, mats[i].clone().multiply(src.matrixWorld));
        inst.frustumCulled = false;
        inst.receiveShadow = true;
        if (src.material.map) src.material.map.anisotropy = 4;
        noReflect(inst); // far behind the bank: not worth a second render in the water
        this.scene.add(inst);
      }
    };
    place(assets.tree, q.trees, -24, -60, 0.8, 1.25);
    place(assets.shrub, q.shrubs, -16.8, -21, 1.3, 2.4);
    place(assets.rock, q.rocks, -15.9, -17, 0.7, 1.4);
  }

  buildFlags(rand) {
    const colors = [['#e3262b', '#ffffff'], ['#ffc21a', '#e3262b'], ['#1c7fd6', '#ffffff'], ['#f07a12', '#ffffff']];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.7, roughness: 0.35 });
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 7, 8);
    const flagMats = colors.map(([c, st]) => this.wavingMaterial(flagTexture(c, st)));
    this.flagMats = flagMats;
    this.poolFlagMaps = flagMats.map((m) => m.map);
    const geo = new THREE.PlaneGeometry(1.9, 1.15, 14, 6);
    geo.translate(0.95, 0, 0);
    for (let i = 0; i < 16; i++) {
      const x = -12 + i * 8.5;
      const z = BANK_Z - 2.2;
      const y = terrainHeight(x, z);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, y + 3.5, z);
      pole.castShadow = true;
      this.staticGroup.add(pole);
      const flag = new THREE.Mesh(geo, flagMats[i % flagMats.length]);
      flag.position.set(x + 0.05, y + 6.3, z);
      flag.rotation.y = rand() * 0.3 - 0.15; // desync neighbouring flags that share a material
      flag.layers.set(1);
      this.scene.add(flag);
    }
  }

  /** Episode look: flags, billboard, water tint and (Episode 6) a night sky with moonlight and a lit skyline. */
  setTheme(theme, episode = 1) {
    if (this.currentTheme === theme && this.currentEp === episode) return;
    this.currentTheme = theme; this.currentEp = episode;
    // flags
    this.themeFlags ??= {};
    if (theme === 'pirate') this.themeFlags.pirate ??= [pirateFlagTexture()];
    else if (theme !== 'pool') this.themeFlags[theme] ??= [0, 1, 2, 3].map((i) => themeFlagTexture(theme, i));
    this.flagMats.forEach((m, i) => {
      m.map = theme === 'pool' ? this.poolFlagMaps[i] : this.themeFlags[theme][i % this.themeFlags[theme].length];
      m.emissive?.set(theme === 'night' ? 0xffffff : 0x000000); m.emissiveMap = theme === 'night' ? m.map : null; m.emissiveIntensity = 0.8;
      m.needsUpdate = true;
    });
    // billboard
    const BOARD = {
      pool: [['#0b3d91', '#06245a'], 'OBSTACLE COURSE · EPISODE 1'], pirate: [['#3a2414', '#140a04'], 'PIRATE COVE · EPISODE 2'],
      steel: [['#5a6068', '#1a1d22'], 'STEEL WORKS · EPISODE 3'], food: [['#e8b646', '#8a4a10'], 'FOOD FIGHT · EPISODE 4'],
      candy: [['#ff6ab0', '#8a2a6a'], 'CANDY LAND · EPISODE 5'], night: [['#07203a', '#010208'], 'GRAND FINALE · EPISODE 6'],
    };
    const [bg, sub] = BOARD[theme] || BOARD.pool;
    this.boardTex[theme] ??= logoTexture({ w: 2048, h: 512, bg, sub });
    this.boardMat.map = this.boardMat.emissiveMap = this.boardTex[theme];
    this.boardMat.emissiveIntensity = theme === 'night' ? 1.1 : 0.25;
    this.boardMat.needsUpdate = true;
    // water tint
    const WATER = { pool: [0x046a7a, 0x2cc6c9], pirate: [0x045a6a, 0x22b0b4], steel: [0x0a5a78, 0x3ab4d0], food: [0x06708a, 0x3ad0d4], candy: [0x0a78a0, 0x5ae0f0], night: [0x010c16, 0x06303e] };
    const [wc, sc] = WATER[theme] || WATER.pool;
    const u = this.water.mesh.material.uniforms;
    u.waterColor.value.set(wc); u.shallowColor.value.set(sc);
    const was = this.night;
    this.setNight(theme === 'night');
    if (was === this.night) this.applyAmbient();
  }

  setNight(on) {
    if (this.night === on) return;
    this.night = on;
    const sc = this.scene, u = this.water.mesh.material.uniforms;
    if (on) {
      if (!this.nightSet) {
        const sky = nightSkyTexture();
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.nightSet = { background: sky, environment: pmrem.fromEquirectangular(sky).texture };
        pmrem.dispose();
        this.nightGroup = this.buildNightScenery();
      }
      sc.background = this.nightSet.background; sc.environment = this.nightSet.environment;
      sc.environmentIntensity = 0.5; sc.backgroundIntensity = 1;
      sc.fog.color.set(0x070b1a); sc.fog.density = 0.0065;
      this.sunDir.set(0.35, 0.62, -0.7).normalize(); // moon behind the course
      this.sun.color.set(0xa8c0ff); this.sun.intensity = 1.35;
      this.hemi.intensity = 0.9;
      if (!this.followSpot) {
        // stage follow-spot on the runner, so the character and obstacles read at night
        this.followSpot = new THREE.SpotLight(0xfff2e0, 0, 34, 0.62, 0.55, 1.2);
        this.scene.add(this.followSpot, this.followSpot.target);
      }
      this.followSpot.intensity = 160;
      u.sunColor.value.set(0xc8d8ff);
      this.nightGroup.visible = true;
    } else {
      sc.background = this.day.background; sc.environment = this.day.environment;
      sc.environmentIntensity = this.day.envI;
      sc.fog.color.set(this.day.fog); sc.fog.density = this.day.fogD;
      this.sunDir.set(-0.45, 0.78, 0.44).normalize();
      this.sun.color.set(0xfff1dc); this.sun.intensity = 3.2;
      this.hemi.intensity = 0;
      if (this.followSpot) this.followSpot.intensity = 0;
      u.sunColor.value.set(0xfff4e0);
      if (this.nightGroup) this.nightGroup.visible = false;
    }
    u.sunDirection.value.copy(this.sunDir);
    u.skyTint.value.set(on ? 0x1c2c58 : 0x6aa8cc);
    this.applyAmbient();
  }

  /** Lite graphics has no image-based lighting, so a hemisphere light carries the ambient. */
  setLite(on) { this.lite = on; this.applyAmbient(); }

  applyAmbient() {
    const h = this.hemi;
    if (this.night) { h.color.set(0x6a8cff); h.groundColor.set(0x05070c); h.intensity = this.lite ? 1.6 : 0.9; }
    else if (this.lite) { h.color.set(0xe4f1ff); h.groundColor.set(0x6c7a58); h.intensity = 1.9; }
    else h.intensity = 0;
    if (this.lite) this.sun.castShadow = false;
  }

  /** stadium floodlights, a lit city skyline behind the hills, and searchlight beams */
  buildNightScenery() {
    const g = new THREE.Group();
    const rand = rng(21);
    // skyline: boxes with window-light textures, far behind the hills
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const cx = c.getContext('2d');
    cx.fillStyle = '#05070d'; cx.fillRect(0, 0, 128, 256);
    for (let y = 6; y < 256; y += 10) for (let x = 6; x < 128; x += 10) if (rand() > 0.45) { cx.fillStyle = rand() > 0.7 ? '#ffd79a' : rand() > 0.5 ? '#9ad4ff' : '#ffb35a'; cx.fillRect(x, y, 5, 6); }
    const wt = new THREE.CanvasTexture(c); wt.colorSpace = THREE.SRGBColorSpace; wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const bmat = new THREE.MeshStandardMaterial({ color: 0x0a0d16, map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.3, roughness: 0.8, fog: false });
    for (let i = 0; i < 70; i++) {
      const w = 6 + rand() * 12, h = 18 + rand() * rand() * 70, d = 6 + rand() * 10;
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 12, uv.getY(k) * h / 24);
      const m = new THREE.Mesh(geo, bmat);
      const x = -120 + i * 5.5 + rand() * 3, z = -150 - rand() * 60;
      m.position.set(x, h / 2 + 4, z);
      g.add(m);
      if (rand() > 0.7) { // blinking red aircraft light
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false }));
        lamp.position.set(x, h + 4.8, z); lamp.userData.blink = rand() * 6; g.add(lamp);
      }
    }
    // floodlight masts along the far bank, with glowing lamp heads
    const glow = glowTexture();
    const sprMat = new THREE.SpriteMaterial({ map: glow, color: 0xdfeaff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.8, roughness: 0.4 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
    for (let i = 0; i < 12; i++) {
      const x = -10 + i * 36, z = -26;
      const y0 = terrainHeight(x, z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 24, 10), mastMat);
      mast.position.set(x, y0 + 12, z); g.add(mast);
      const head = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 0.4), headMat);
      head.position.set(x, y0 + 24.5, z + 0.3); head.rotation.x = -0.35; g.add(head);
      const spr = new THREE.Sprite(sprMat); spr.scale.set(16, 10, 1); spr.position.set(x, y0 + 24.5, z + 1); g.add(spr);
    }
    // sweeping searchlight beams
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x9ac8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.beams = [];
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.ConeGeometry(6, 140, 20, 1, true); geo.translate(0, 70, 0);
      const b = new THREE.Mesh(geo, beamMat);
      b.position.set(-20 + i * 55, 2, -110); b.userData.ph = i * 1.3;
      g.add(b); this.beams.push(b);
    }
    noReflect(g);
    for (const o of g.children) o.layers.set(1);
    this.scene.add(g);
    return g;
  }

  /** Flag cloth animated in the vertex shader (no per-frame CPU work). */
  wavingMaterial(map) {
    const m = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 });
    m.userData.noLite = true; // custom waving vertex shader + per-theme texture swaps
    const time = this.flagTime;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        vec3 transformed = position;
        float k = position.x / 1.9;
        vec4 wp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float ph = wp.x * 0.37;
        transformed.z = sin(uTime * 5.0 + position.x * 3.2 + ph) * 0.22 * k + sin(uTime * 3.1 + position.y * 2.0 + ph) * 0.05 * k;`);
    };
    return m;
  }

  buildSignage() {
    // Big course billboard behind the channel.
    const tex = logoTexture({ w: 2048, h: 512, bg: ['#0b3d91', '#06245a'], sub: 'OBSTACLE COURSE · EPISODE 1' });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    board.userData.keep = true; // its texture changes per episode, so keep it out of the static merge
    this.boardMat = board.material;
    this.boardMat.userData.noLite = true; // texture swapped per episode
    this.boardTex = { pool: tex };
    const z = -30, x = 52, y = terrainHeight(x, z);
    board.position.set(x, y + 6.5, z);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, metalness: 0.8, roughness: 0.4 });
    const legGeo = new THREE.BoxGeometry(0.3, 8.5, 0.3);
    for (const dx of [-6, 6]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + dx, y + 4.25 - 0.2, z - 0.2);
      this.staticGroup.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(16.3, 4.3, 0.2), legMat);
    back.position.set(x, y + 6.5, z - 0.12);
    this.staticGroup.add(board, back);
  }

  buildLaneFloats() {
    // Floating lane ropes (red/white buoys) give the water scale & depth cues.
    const geo = new THREE.CylinderGeometry(0.11, 0.11, 0.26, 12);
    geo.rotateZ(Math.PI / 2);
    const red = new THREE.MeshPhysicalMaterial({ color: 0xd8261e, roughness: 0.35, clearcoat: 0.6 });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: 0.35, clearcoat: 0.6 });
    const n = 560;
    this.floats = [];
    for (const [z, mat, offset] of [[4.2, red, 0], [4.2, white, 1], [-7.5, red, 0], [-7.5, white, 1]]) {
      const inst = new THREE.InstancedMesh(geo, mat, n / 2);
      inst.layers.set(1);
      this.floats.push({ inst, z, offset });
      this.scene.add(inst);
    }
    this.floatTime = 0;
    this.updateFloats(0);
  }

  updateFloats(dt) {
    this.floatTime += dt;
    const m = new THREE.Matrix4();
    for (const f of this.floats) {
      for (let i = 0; i < f.inst.count; i++) {
        const x = -30 + (i * 2 + f.offset) * 0.3;
        const y = 0.03 + Math.sin(this.floatTime * 1.6 + x * 0.7 + f.z) * 0.025;
        m.makeTranslation(x, y, f.z);
        f.inst.setMatrixAt(i, m);
      }
      f.inst.instanceMatrix.needsUpdate = true;
    }
  }

  update(dt, focus) {
    this.water.update(dt);
    // keep the shadow frustum centred on the action
    this.sun.target.position.set(focus.x + 4, focus.y, 0);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 40);
    this.sun.target.updateMatrixWorld();
    this.flagTime.value = this.water.time;
    this.updateFloats(dt);
    if (this.night && this.followSpot) {
      this.followSpot.position.set(focus.x - 3, focus.y + 9, 9);
      this.followSpot.target.position.set(focus.x + 1.5, focus.y - 0.8, 0);
      this.followSpot.target.updateMatrixWorld();
    }
    if (this.night && this.nightGroup) {
      const t = this.water.time;
      for (const b of this.beams) { b.rotation.z = Math.sin(t * 0.25 + b.userData.ph) * 0.5; b.rotation.x = Math.cos(t * 0.2 + b.userData.ph) * 0.25; }
      for (const o of this.nightGroup.children) if (o.userData.blink !== undefined) o.visible = Math.floor((t + o.userData.blink) * 1.2) % 3 === 0;
    }
  }
}
