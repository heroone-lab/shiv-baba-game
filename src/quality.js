// Picks a rendering tier. 'high' for desktops, 'low' for phones/tablets.
// Overridable with ?q=high|low or the saved setting.
const params = new URLSearchParams(location.search);
// Android TV: the TV APK adds "ShivBabaTV" to the WebView user agent; other TV browsers are
// recognised by their user agent, and ?tv forces it for testing.
export const IS_TV = params.has('tv') || /ShivBabaTV|Android ?TV|GoogleTV|SMART-?TV|SmartTV|BRAVIA|AFT[A-Z]|\bTV\b/i.test(navigator.userAgent);
// TV WebViews often report touch support even though there is no touchscreen
const isTouch = !IS_TV && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/**
 * Graphics style. 'full' = live shadows, mirror water, PBR, post effects.
 * 'lite' = the 2014 mobile trick: blob shadow, no mirror, cheap Lambert shading, no post.
 * TVs default to lite. Saved in localStorage 'sb_gfx', ?gfx=lite|full overrides.
 */
export function graphicsMode() {
  const g = params.get('gfx') || localStorage.getItem('sb_gfx');
  if (g === 'lite' || g === 'full') return g;
  return IS_TV ? 'lite' : 'full';
}

export function detectQuality() {
  const q = new URLSearchParams(location.search).get('q') || localStorage.getItem('sb_quality');
  if (q === 'high' || q === 'low') return q;
  return IS_TV || isMobileUA || isTouch ? 'low' : 'high';
}

export const IS_TOUCH = isTouch;

export function qualitySettings(tier) {
  if (IS_TV && tier === 'low') {
    // TV box class hardware (quad Cortex-A53 + Mali-G52, 1-2 GB RAM, 1080p panel):
    // small textures, very little scenery, render at most 720p
    return { tier, pixelRatio: 1, shadowMap: 512, waterRes: 256, hero: 'models/hero_mobile.glb', sky: 'env/sky_1k.hdr', trees: 3, shrubs: 8, rocks: 4, bloom: false, msaa: 0 };
  }
  if (tier === 'high') {
    return {
      tier,
      pixelRatio: Math.min(devicePixelRatio, 2),
      shadowMap: 2048,
      waterRes: 1024,
      hero: 'models/hero.glb',
      sky: 'env/sky_2k.hdr',
      trees: 9,
      shrubs: 36,
      rocks: 20,
      bloom: true,
      msaa: 4,
    };
  }
  return {
    tier,
    pixelRatio: Math.min(devicePixelRatio, 1.5),
    shadowMap: 1024,
    waterRes: 512,
    hero: 'models/hero_mobile.glb',
    sky: 'env/sky_1k.hdr',
    trees: 5,
    shrubs: 18,
    rocks: 10,
    bloom: true,
    msaa: 0,
  };
}
