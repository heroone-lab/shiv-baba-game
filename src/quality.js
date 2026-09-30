// Picks a rendering tier. 'high' for desktops, 'low' for phones/tablets.
// Overridable with ?q=high|low or the saved setting.
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export function detectQuality() {
  const q = new URLSearchParams(location.search).get('q') || localStorage.getItem('sb_quality');
  if (q === 'high' || q === 'low') return q;
  return isMobileUA || isTouch ? 'low' : 'high';
}

export const IS_TOUCH = isTouch;

export function qualitySettings(tier) {
  if (tier === 'high') {
    return {
      tier,
      pixelRatio: Math.min(devicePixelRatio, 2),
      shadowMap: 2048,
      waterRes: 1024,
      hero: 'models/hero.glb',
      sky: 'env/sky_2k.hdr',
      trees: 11,
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
    trees: 6,
    bloom: true,
    msaa: 0,
  };
}
