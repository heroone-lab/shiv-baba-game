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
