import * as THREE from 'three';
import {
  steelPlateTexture, spongeTexture, cheeseTexture, cookieTexture, rainbowTexture, stripeTexture,
  peppermintTexture, mushroomTexture, stoneTexture, neonDeckTextures,
} from './themeTextures.js';

// Every episode has a theme. A theme does two things:
//  1. skinMats(): a copy of the shared materials with some slots swapped, so the
//     obstacle classes from earlier episodes (which ask for mats.darkWood,
//     mats.padRed, ...) automatically get the new look.
//  2. style: how the course builder dresses decks, posts, blocks, balls, arches.
// Themes: pool (Ep 1), pirate (Ep 2), steel (Ep 3), food (Ep 4), candy (Ep 5), night (Ep 6).

function vinyl(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25, ...extra });
}
function glowVinyl(color, intensity = 0.45) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: color, emissiveIntensity: intensity });
}
export function neonMat(color, intensity = 2.2) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 0.5, toneMapped: true });
}

/** Extra theme materials, created once and shared by every round of that theme. */
export function themeMaterials(mats, theme) {
  const key = 'theme:' + theme;
  if (mats.cache.has(key)) return mats.cache.get(key);
  let t = {};
  if (theme === 'steel') {
    const plate = steelPlateTexture();
    t = {
      deck: new THREE.MeshStandardMaterial({ map: plate, color: 0xd8dce0, metalness: 0.55, roughness: 0.48 }),
      gunmetal: new THREE.MeshStandardMaterial({ map: plate, color: 0x6a7078, metalness: 0.7, roughness: 0.42 }),
      blackSteel: new THREE.MeshStandardMaterial({ color: 0x17181b, metalness: 0.8, roughness: 0.32 }),
      hazard: new THREE.MeshStandardMaterial({ map: stripeTexture('#f07a12', '#f4f1ea', 3), roughness: 0.45, metalness: 0.2 }),
      stone: new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.75, metalness: 0.05 }),
      yellowPole: new THREE.MeshStandardMaterial({ map: stripeTexture('#e8b21a', '#2a2a2a', 6), roughness: 0.4, metalness: 0.4 }),
      rainbow: new THREE.MeshStandardMaterial({ map: rainbowTexture(), roughness: 0.4 }),
    };
  } else if (theme === 'food') {
    const sp = spongeTexture();
    t = {
      deck: new THREE.MeshStandardMaterial({ map: sp, color: 0xffffff, roughness: 0.78 }),
      crust: new THREE.MeshStandardMaterial({ map: sp, color: 0xb87a38, roughness: 0.8 }),
      cheese: new THREE.MeshStandardMaterial({ map: cheeseTexture(), roughness: 0.55 }),
      cookie: new THREE.MeshStandardMaterial({ map: cookieTexture(), roughness: 0.8 }),
      apple: vinyl(0xc8141a, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x3f9a2a, roughness: 0.6, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 }),
      sausage: vinyl(0x8a3a1c, { roughness: 0.35, clearcoat: 0.9 }),
      cucumber: new THREE.MeshStandardMaterial({ color: 0x4a8a2a, roughness: 0.5 }),
      cucumberIn: new THREE.MeshStandardMaterial({ color: 0xc8e89a, roughness: 0.6 }),
      bun: vinyl(0xd88a2a, { roughness: 0.5, clearcoat: 0.5 }),
      patty: new THREE.MeshStandardMaterial({ color: 0x4a2412, roughness: 0.85 }),
      lettuce: new THREE.MeshStandardMaterial({ color: 0x6ac23a, roughness: 0.6 }),
      pickle: vinyl(0x7ab83a, { roughness: 0.4 }),
      cane: new THREE.MeshStandardMaterial({ map: stripeTexture('#d8261e', '#ffffff', 5), roughness: 0.3 }),
      bread: new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.85 }),
      ham: vinyl(0xe87a7a, { roughness: 0.5 }),
    };
  } else if (theme === 'candy') {
    t = {
      deck: vinyl(0xf07ab4, { roughness: 0.45, clearcoat: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xffc0e0) }),
      deckDark: vinyl(0xc8508e),
      rainbow: new THREE.MeshStandardMaterial({ map: rainbowTexture(), roughness: 0.35 }),
      rainbowV: new THREE.MeshStandardMaterial({ map: rainbowTexture(true), roughness: 0.35 }),
      mint: new THREE.MeshPhysicalMaterial({ map: peppermintTexture(), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
      mushroom: new THREE.MeshPhysicalMaterial({ map: mushroomTexture(), roughness: 0.35, clearcoat: 0.7 }),
      stalk: vinyl(0xf4ecd8, { roughness: 0.6 }),
      jelly: new THREE.MeshPhysicalMaterial({ color: 0x1f6a4a, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.5, sheenColor: new THREE.Color(0x7affc8) }),
      cookie: new THREE.MeshStandardMaterial({ map: cookieTexture(), roughness: 0.8 }),
      lolly: new THREE.MeshStandardMaterial({ map: stripeTexture('#ff5aa8', '#ffffff', 4), roughness: 0.3 }),
      pinkWhite: vinyl(0xffe4f2),
      grape: vinyl(0x8a4ce8),
    };
  } else if (theme === 'night') {
    const cyan = neonDeckTextures('#28e8ff');
    t = {
      deck: new THREE.MeshStandardMaterial({ map: cyan.map, emissive: 0xffffff, emissiveMap: cyan.emissive, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.4 }),
      carbon: new THREE.MeshStandardMaterial({ color: 0x4a5264, metalness: 0.55, roughness: 0.34 }),
      cyan: neonMat(0x28e8ff), pink: neonMat(0xff3cc8), gold: neonMat(0xffc21a), green: neonMat(0x5aff7a), red: neonMat(0xff2a2a, 2.6),
      white: neonMat(0xffffff, 1.4), violet: neonMat(0x9a5aff),
      laser: new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
      fire: new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
      arc: new THREE.MeshBasicMaterial({ color: 0x9adfff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x28e8ff, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.55, emissive: 0x28e8ff, emissiveIntensity: 0.6, clearcoat: 1 }),
      padPink: glowVinyl(0xff3cc8), padCyan: glowVinyl(0x1cc8ff), padGold: glowVinyl(0xffb81a), padGreen: glowVinyl(0x3aff6a),
      padViolet: glowVinyl(0x8a4cff), padWhiteGlow: glowVinyl(0xe8f4ff, 0.25), padOrangeGlow: glowVinyl(0xff7a1a),
    };
  }
  mats.cache.set(key, t);
  return t;
}

/** A materials object for one theme: same API as Materials, some slots re-skinned. */
export function skinMats(mats, theme) {
  if (theme === 'pool' || theme === 'pirate' || !theme) return mats;
  const key = 'skin:' + theme;
  if (mats.cache.has(key)) return mats.cache.get(key);
  const t = themeMaterials(mats, theme);
  const s = Object.create(mats);
  s.t = t;
  s.theme = theme;
  if (theme === 'steel') Object.assign(s, { planks: t.deck, darkWood: t.gunmetal, bark: mats.darkSteel, woodPost: mats.iron, rope: mats.darkSteel });
  if (theme === 'food') Object.assign(s, { planks: t.deck, darkWood: t.crust, bark: mats.steelBright, woodPost: mats.steelBright, rope: t.stem });
  if (theme === 'candy') Object.assign(s, { planks: t.deck, darkWood: t.deckDark, bark: mats.steelBright, woodPost: mats.steelBright, rope: t.pinkWhite, padBlue: t.grape });
  if (theme === 'night') {
    Object.assign(s, {
      planks: t.deck, darkWood: t.carbon, bark: mats.darkSteel, woodPost: mats.darkSteel, rope: mats.darkSteel,
      padRed: t.padPink, padBlue: t.padCyan, padYellow: t.padGold, padOrange: t.padOrangeGlow, padTeal: t.padGreen, padWhite: t.padWhiteGlow,
      brass: t.gold, iron: t.carbon,
    });
  }
  mats.cache.set(key, s);
  return s;
}
