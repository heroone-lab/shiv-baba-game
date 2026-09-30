import * as THREE from 'three';

// Shared PBR materials. Textures from Poly Haven (CC0); ARM = AO/Roughness/Metal packed.
export class Materials {
  constructor(assets) {
    this.a = assets;
    this.cache = new Map();

    this.planks = this.pbr(assets.planks, { color: 0xd8c8b0, normalScale: 1.0 });
    this.bark = this.pbr(assets.bark, { color: 0xc9b6a0, normalScale: 1.2 });
    this.woodPost = this.pbr(assets.planks, { color: 0x8a6e52, normalScale: 0.8 });
    this.grass = this.pbr(assets.grass, { color: 0xb8c890, normalScale: 0.8 });

    // Foam pads covered in glossy vinyl, like real TV obstacle courses.
    this.padRed = vinyl(0xd8321e);
    this.padOrange = vinyl(0xf07a12);
    this.padYellow = vinyl(0xf4c21a);
    this.padBlue = vinyl(0x1c7fd6);
    this.padTeal = vinyl(0x16b3b8);
    this.padWhite = vinyl(0xeeeeea);
    this.steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 });
    this.darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.8, roughness: 0.45 });
    this.rope = new THREE.MeshStandardMaterial({ color: 0xcdb58a, roughness: 0.9 });
    this.concrete = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.85 });
    this.tile = new THREE.MeshPhysicalMaterial({ color: 0x1b8fc4, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    // pirate set (Episode 2)
    this.iron = new THREE.MeshStandardMaterial({ color: 0x1c1d21, metalness: 0.75, roughness: 0.38 });
    this.brass = new THREE.MeshStandardMaterial({ color: 0xb8863b, metalness: 0.9, roughness: 0.3 });
    this.steelBright = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.95, roughness: 0.22 });
    this.shark = new THREE.MeshStandardMaterial({ color: 0x7d8a96, roughness: 0.45, metalness: 0.05 });
    this.sharkBelly = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5 });
    this.gold = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 1, roughness: 0.25, emissive: 0x6a3a00, emissiveIntensity: 0.35 });
    this.darkWood = this.pbr(assets.planks, { color: 0x8c6a4c, normalScale: 1.0 });
    this.fancyMats = [this.padRed, this.padOrange, this.padYellow, this.padBlue, this.padTeal, this.padWhite, this.tile];
    this.fancy = true;
  }

  /** clearcoat + sheen cost a lot of per-pixel lighting; only the 1080p budget keeps them */
  setFancy(on) {
    if (on === this.fancy) return;
    this.fancy = on;
    for (const m of this.fancyMats) {
      m.userData.cc ??= m.clearcoat; m.userData.sh ??= m.sheen;
      m.clearcoat = on ? m.userData.cc : 0;
      m.sheen = on ? m.userData.sh : 0;
      m.roughness = on ? m.userData.r ?? m.roughness : (m.userData.r ??= m.roughness) * 0.85; // keep some gloss without clearcoat
      m.needsUpdate = true;
    }
  }

  pbr(set, { color = 0xffffff, normalScale = 1 }) {
    return new THREE.MeshStandardMaterial({
      color,
      map: set.map,
      normalMap: set.normalMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: set.arm,
      roughnessMap: set.arm,
      metalnessMap: set.arm,
      roughness: 1,
      metalness: 1,
      aoMapIntensity: 1,
    });
  }
}

function vinyl(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    sheen: 0.3,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(color).multiplyScalar(0.6),
  });
}

// Replace UVs with world-scaled box projection so textures keep real-world
// scale regardless of mesh size. `scale` = texture repeats per metre.
export function boxUV(geo, scale = 0.5) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Cylinder along its local Y with UVs scaled to real size (u around, v along).
export function cylinderUV(geo, radius, length, scale = 0.5) {
  const uv = geo.attributes.uv;
  const circ = 2 * Math.PI * radius;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ * scale, uv.getY(i) * length * scale);
  uv.needsUpdate = true;
  return geo;
}
