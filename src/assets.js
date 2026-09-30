import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Loads everything the round needs, reporting progress 0..1.
export async function loadAssets(q, onProgress) {
  const manager = new THREE.LoadingManager();
  const weights = new Map(); // url -> [loaded, total]
  const report = () => {
    let l = 0, t = 0;
    for (const [a, b] of weights.values()) { l += a; t += b || a || 1; }
    onProgress(t ? Math.min(1, l / t) : 0);
  };
  const prog = (url, est) => {
    weights.set(url, [0, est]);
    return (e) => { weights.set(url, [e.loaded, e.total || est]); report(); };
  };

  const gltf = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const tex = new THREE.TextureLoader(manager);
  const hdr = new HDRLoader(manager);

  const loadGLTF = (url, est) => new Promise((res, rej) => gltf.load(url, res, prog(url, est), rej));
  const loadTex = (url, srgb = false) =>
    new Promise((res, rej) => {
      weights.set(url, [0, 6e5]);
      tex.load(url, (t) => {
        weights.set(url, [6e5, 6e5]); report();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        res(t);
      }, undefined, rej);
    });
  const loadHDR = (url) => new Promise((res, rej) => hdr.load(url, res, prog(url, 5e6), rej));

  const pbr = async (name) => ({
    map: await loadTex(`tex/${name}_diff.jpg`, true),
    normalMap: await loadTex(`tex/${name}_nor.jpg`),
    arm: await loadTex(`tex/${name}_arm.jpg`),
  });

  const [hero, tree, shrub, rock, sky, planks, bark, grass, waterNormals] = await Promise.all([
    loadGLTF(q.hero, 1.5e7),
    loadGLTF('models/jacaranda_tree.glb', 1.6e6),
    loadGLTF('models/shrub_04.glb', 1.5e5),
    loadGLTF('models/rock_07.glb', 1.3e5),
    loadHDR(q.sky),
    pbr('planks'),
    pbr('bark'),
    pbr('grass'),
    loadTex('tex/waternormals.jpg'),
  ]);
  onProgress(1);
  return { hero, tree, shrub, rock, sky, planks, bark, grass, waterNormals };
}
