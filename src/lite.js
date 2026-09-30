import * as THREE from 'three';

// "Lite" graphics: how 2014-era mobile games looked good on weak GPUs.
//  - Lambert (diffuse) shading instead of PBR: no per-pixel GGX / image-based lighting
//  - a soft blob shadow under the runner instead of a shadow map
//  - pool water without the planar mirror (the mirror re-renders the whole scene)
//  - a hemisphere light standing in for the HDRI ambient
//  - no post-processing (tone mapping happens in the main pass)
// Colours, textures and emissive neon are kept, so the look stays the same style.

const cache = new Map();

function lambertFor(m) {
  // Basic / Lambert / Shader / Water stay as they are; so do materials the game re-textures or
  // animates by reference (flags, billboard, boost strips: userData.noLite)
  if (!m || !m.isMeshStandardMaterial || m.userData.noLite) return m;
  let l = cache.get(m.uuid);
  if (l) return l;
  l = new THREE.MeshLambertMaterial({
    color: m.color.clone(),
    map: m.map,
    emissive: m.emissive.clone(),
    emissiveMap: m.emissiveMap,
    emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent,
    opacity: m.opacity,
    alphaTest: m.alphaTest,
    side: m.side,
    depthWrite: m.depthWrite,
    depthTest: m.depthTest,
    blending: m.blending,
    vertexColors: m.vertexColors,
    flatShading: m.flatShading,
    fog: m.fog,
    polygonOffset: m.polygonOffset,
    polygonOffsetFactor: m.polygonOffsetFactor,
    polygonOffsetUnits: m.polygonOffsetUnits,
    toneMapped: m.toneMapped,
  });
  // metals have a dark diffuse under PBR but read through reflections; lift them a little
  if (m.metalness > 0.5 && !m.metalnessMap) l.color.lerp(new THREE.Color(0xb8c0c8), 0.18);
  l.name = m.name;
  cache.set(m.uuid, l);
  return l;
}

/** Swap every PBR material under `root` to its cached Lambert twin. Safe to call repeatedly. */
export function liteMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map(lambertFor);
    else o.material = lambertFor(o.material);
    o.castShadow = false;
  });
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  rg.addColorStop(0, 'rgba(0,0,0,0.62)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.32)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** Soft dark disc under a character; shrinks and fades as it jumps. */
export class BlobShadow {
  constructor(scene) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    m.layers.set(1);
    scene.add(m);
    this.mesh = m;
  }
  update(pos, course) {
    const d = course.supportAt(pos.x, pos.z);
    if (!d || pos.y < d.topAt(pos.x) - 0.3) { this.mesh.visible = false; return; }
    const top = d.topAt(pos.x);
    const h = Math.max(0, pos.y - top);
    const s = THREE.MathUtils.clamp(1.15 - h * 0.18, 0.45, 1.15);
    this.mesh.visible = true;
    this.mesh.position.set(pos.x, top + 0.02, pos.z);
    this.mesh.scale.set(s * 1.05, s * 0.8, 1);
    this.mesh.material.opacity = THREE.MathUtils.clamp(1 - h * 0.22, 0.25, 1);
  }
}
