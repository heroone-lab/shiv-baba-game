import * as THREE from 'three';
import { PoolWater } from './PoolWater.js';
import { boxUV } from './materials.js';
import { logoTexture, flagTexture, pirateFlagTexture } from './textures.js';
import { mergeStatic, noReflect } from './merge.js';

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

  /** Episode look: pool flags + blue billboard (Ep 1) or skull flags + pirate billboard (Ep 2). */
  setTheme(theme, episode = 1) {
    if (this.currentTheme === theme && this.currentEp === episode) return;
    this.currentTheme = theme; this.currentEp = episode;
    const pirate = theme === 'pirate';
    if (pirate && !this.pirateFlag) this.pirateFlag = pirateFlagTexture();
    this.flagMats.forEach((m, i) => { m.map = pirate ? this.pirateFlag : this.poolFlagMaps[i]; m.needsUpdate = true; });
    if (!this.boardTex[episode]) {
      this.boardTex[episode] = logoTexture({ w: 2048, h: 512, bg: pirate ? ['#3a2414', '#140a04'] : ['#0b3d91', '#06245a'], sub: pirate ? 'PIRATE COVE · EPISODE 2' : `OBSTACLE COURSE · EPISODE ${episode}` });
    }
    this.boardMat.map = this.boardMat.emissiveMap = this.boardTex[episode];
    this.boardMat.needsUpdate = true;
  }

  /** Flag cloth animated in the vertex shader (no per-frame CPU work). */
  wavingMaterial(map) {
    const m = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 });
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
    this.boardTex = { 1: tex };
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
  }
}
