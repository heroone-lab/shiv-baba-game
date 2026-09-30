import './style.css';
import { Game } from './game.js';

// Native (Capacitor/Android) niceties: landscape lock + hidden status bar.
if (window.Capacitor?.isNativePlatform?.()) {
  import('@capacitor/status-bar').then(({ StatusBar }) => StatusBar.hide().catch(() => {}));
  import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {}));
}

const game = new Game();
game.boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loadtxt');
  if (t) t.textContent = 'Failed to load: ' + e.message;
  window.__info = { error: String(e && e.stack || e) };
  window.__done = true;
});
