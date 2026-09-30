import * as THREE from 'three';

// Minimal 3D collision helpers: player capsule vs. obstacle primitives
// (oriented boxes, spheres, capsules) attached to animated Object3Ds.

const _inv = new THREE.Matrix4();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Vector3();
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _r = new THREE.Vector3();

export function box(node, center, half) { return { kind: 'box', node, center, half }; }
export function sphere(node, center, r) { return { kind: 'sphere', node, center, r }; }
export function capsule(node, a, b, r) { return { kind: 'capsule', node, a, b, r }; }

// closest points between segments p1q1 and p2q2 -> writes into c1, c2
function closestSegSeg(p1, q1, p2, q2, c1, c2) {
  _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2);
  const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r);
  let s, t;
  if (a <= 1e-8 && e <= 1e-8) { s = t = 0; }
  else if (a <= 1e-8) { s = 0; t = THREE.MathUtils.clamp(f / e, 0, 1); }
  else {
    const c = _d1.dot(_r);
    if (e <= 1e-8) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
    else {
      const b = _d1.dot(_d2), denom = a * e - b * b;
      s = denom !== 0 ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((b - c) / a, 0, 1); }
    }
  }
  c1.copy(p1).addScaledVector(_d1, s);
  c2.copy(p2).addScaledVector(_d2, t);
}

function closestPointSeg(p, a, b, out) {
  _d1.subVectors(b, a);
  const t = THREE.MathUtils.clamp(_d1.dot(_r.subVectors(p, a)) / Math.max(_d1.lengthSq(), 1e-8), 0, 1);
  return out.copy(a).addScaledVector(_d1, t);
}

const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3(), _wa = new THREE.Vector3(), _wb = new THREE.Vector3();
const _best = new THREE.Vector3(), _bestP = new THREE.Vector3(), _q = new THREE.Vector3();

/**
 * Test a world-space capsule (segA-segB, radius) against a collider.
 * Returns null or { depth, normal (world, pointing from obstacle to player), point (world contact on obstacle) }.
 */
export function testCapsule(segA, segB, radius, col) {
  const M = col.node.matrixWorld;
  if (col.kind === 'sphere') {
    _c.copy(col.center).applyMatrix4(M);
    closestPointSeg(_c, segA, segB, _p);
    const d = _p.distanceTo(_c), rr = radius + col.r;
    if (d >= rr) return null;
    const n = _p.clone().sub(_c).normalize();
    return { depth: rr - d, normal: n, point: _c.clone().addScaledVector(n, col.r) };
  }
  if (col.kind === 'capsule') {
    _wa.copy(col.a).applyMatrix4(M); _wb.copy(col.b).applyMatrix4(M);
    closestSegSeg(segA, segB, _wa, _wb, _c1, _c2);
    const d = _c1.distanceTo(_c2), rr = radius + col.r;
    if (d >= rr) return null;
    const n = _c1.clone().sub(_c2).normalize();
    return { depth: rr - d, normal: n, point: _c2.clone().addScaledVector(n, col.r) };
  }
  // oriented box: work in node-local space (nodes carry no scale)
  _inv.copy(M).invert();
  _a.copy(segA).applyMatrix4(_inv); _b.copy(segB).applyMatrix4(_inv);
  let bestD = Infinity;
  const h = col.half, c = col.center;
  for (let i = 0; i <= 8; i++) {
    _p.lerpVectors(_a, _b, i / 8);
    _q.set(
      THREE.MathUtils.clamp(_p.x - c.x, -h.x, h.x) + c.x,
      THREE.MathUtils.clamp(_p.y - c.y, -h.y, h.y) + c.y,
      THREE.MathUtils.clamp(_p.z - c.z, -h.z, h.z) + c.z,
    );
    const d = _p.distanceTo(_q);
    if (d < bestD) { bestD = d; _best.copy(_q); _bestP.copy(_p); }
  }
  if (bestD >= radius) return null;
  let nLocal;
  if (bestD > 1e-5) nLocal = _bestP.clone().sub(_best).normalize();
  else {
    // segment centre is inside the box: push out through the nearest face
    const lx = _bestP.x - c.x, ly = _bestP.y - c.y, lz = _bestP.z - c.z;
    const px = h.x - Math.abs(lx), py = h.y - Math.abs(ly), pz = h.z - Math.abs(lz);
    if (px < py && px < pz) nLocal = new THREE.Vector3(Math.sign(lx) || 1, 0, 0);
    else if (py < pz) nLocal = new THREE.Vector3(0, Math.sign(ly) || 1, 0);
    else nLocal = new THREE.Vector3(0, 0, Math.sign(lz) || 1);
  }
  const normal = nLocal.transformDirection(M);
  const point = _best.clone().applyMatrix4(M);
  return { depth: radius - bestD, normal, point };
}

/** velocity of a point fixed to `node` given its previous-frame world matrix */
export function pointVelocity(node, prevMatrix, worldPoint, dt, out = new THREE.Vector3()) {
  _inv.copy(node.matrixWorld).invert();
  const local = worldPoint.clone().applyMatrix4(_inv);
  const prev = local.applyMatrix4(prevMatrix);
  return out.subVectors(worldPoint, prev).divideScalar(Math.max(dt, 1e-4));
}
