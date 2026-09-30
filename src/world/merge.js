import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Layer 1 = rendered by the main camera only (skipped by the water reflection).
export const NO_REFLECT = 1;

export function noReflect(obj) {
  obj.traverse((o) => o.layers.set(NO_REFLECT));
  return obj;
}

/**
 * Bake static meshes into one mesh per (material, shadow flags, layer) so the
 * GPU gets a handful of draw calls instead of hundreds.
 * `pick(mesh)` decides which meshes are static and can be merged.
 */
export function mergeStatic(root, pick, target = root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(target.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !pick(o)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.layers.mask}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, mask: o.layers.mask, geos: [] }));
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.morphAttributes = {};
    b.geos.push(g);
    victims.push(o);
  });
  let merged = 0;
  for (const b of buckets.values()) {
    const indexed = b.geos.every((g) => g.index);
    const geos = indexed ? b.geos : b.geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const geo = mergeGeometries(geos, false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, b.mat);
    m.castShadow = b.cast; m.receiveShadow = b.recv; m.layers.mask = b.mask;
    m.matrixAutoUpdate = false;
    target.add(m);
    merged += geos.length;
  }
  for (const o of victims) o.removeFromParent();
  return { meshes: merged, drawCalls: buckets.size };
}
