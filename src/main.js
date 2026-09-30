import './style.css';
import { Game } from './game.js';

// Native (Capacitor/Android) niceties: landscape lock + hidden status bar.
if (window.Capacitor?.isNativePlatform?.()) {
  import('@capacitor/status-bar').then(({ StatusBar }) => StatusBar.hide().catch(() => {}));
  import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {}));
}

// The renderer needs WebGL 2 (OpenGL ES 3.0 GPUs). Older GPUs such as the Mali-400/450/470
// in budget TVs only have OpenGL ES 2.0, so say so clearly instead of failing silently.
const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
if (!gl2) {
  const t = document.getElementById('loadtxt');
  if (t) t.innerHTML = 'This device\'s graphics chip does not support WebGL 2 (OpenGL ES 3.0).<br>SHIV BABA needs it. GPUs like Mali-400/450/470 only have OpenGL ES 2.0.<br>If this is a TV, update "Android System WebView" from the Play Store and try again.';
  window.__done = true;
  throw new Error('WebGL 2 not available');
}
const game = new Game();
game.boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loadtxt');
  if (t) t.textContent = 'Failed to load: ' + e.message;
  window.__info = { error: String(e && e.stack || e) };
  window.__done = true;
});
