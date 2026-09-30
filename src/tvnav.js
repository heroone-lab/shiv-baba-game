// Remote-control (D-pad) navigation for Android TV, also handy with a keyboard.
// Arrow keys move focus between the visible buttons of the open screen by position;
// OK / Enter presses the focused button (native button behaviour).
// Back (Android back button, Escape, Backspace, BrowserBack) goes one step back.

const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

function visibleButtons(screen) {
  return [...screen.querySelectorAll('button:not([disabled])')].filter((b) => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden';
  });
}

function defaultButton(screen) {
  const pick = screen.querySelector('#nextBtn:not([style*="none"])') || screen.querySelector('.round.sel') ||
    screen.querySelector('#play') || screen.querySelector('.btn.primary') || screen.querySelector('.seg button.on');
  return pick && visibleButtons(screen).includes(pick) ? pick : visibleButtons(screen)[0];
}

export function focusDefault() {
  const screen = document.querySelector('.screen.show');
  if (!screen) return;
  const cur = document.activeElement;
  if (cur && screen.contains(cur) && cur.tagName === 'BUTTON') return;
  defaultButton(screen)?.focus({ preventScroll: true });
}

function move(screen, [dx, dy]) {
  const list = visibleButtons(screen);
  if (!list.length) return;
  const cur = document.activeElement;
  if (!cur || !list.includes(cur)) { defaultButton(screen)?.focus(); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const b of list) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect();
    const bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const along = (bx - ax) * dx + (by - ay) * dy;
    if (along <= 4) continue;
    const across = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
    const score = along + across * 2.2;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}

export function initTvNav(game) {
  addEventListener('keydown', (e) => {
    const screen = document.querySelector('.screen.show');
    const back = ['Escape', 'Backspace', 'BrowserBack', 'GoBack'].includes(e.key) || e.keyCode === 4;
    if (back) {
      if (game.mode === 'play' || game.mode === 'paused' && screen?.id === 'pause') return; // Input handles pause/resume
      e.preventDefault(); game.onBack(); return;
    }
    if (!screen || screen.id === 'loading') return;
    const d = DIRS[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    move(screen, d);
  }, true);
}
