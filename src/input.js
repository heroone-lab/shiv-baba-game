// Unified input: keyboard, on-screen touch buttons and gamepad.
// `jumpPressed` / `slidePressed` are edge-triggered for one frame.
export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, jump: false, slide: false };
    this.prevJump = false;
    this.prevSlide = false;
    this.move = 0;
    this.jumpHeld = false;
    this.jumpPressed = false;
    this.slidePressed = false;
    this.pausePressed = false;
    this.enabled = true;

    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (['Escape', 'KeyP', 'Backspace', 'BrowserBack', 'MediaPlayPause', 'MediaPause'].includes(e.code) || ['GoBack', 'MediaPlayPause'].includes(e.key)) this.pausePressed = true;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); for (const k in this.touch) this.touch[k] = false; });
  }

  bindTouch(root) {
    for (const btn of root.querySelectorAll('[data-touch]')) {
      const k = btn.dataset.touch;
      const on = (e) => { e.preventDefault(); this.touch[k] = true; btn.classList.add('on'); navigator.vibrate?.(8); };
      const off = (e) => { e.preventDefault(); this.touch[k] = false; btn.classList.remove('on'); };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  update() {
    const k = this.keys;
    let move = 0;
    if (k.has('ArrowRight') || k.has('KeyD') || this.touch.right) move += 1;
    if (k.has('ArrowLeft') || k.has('KeyA') || this.touch.left) move -= 1;
    // Enter = the OK button in the middle of a TV remote's D-pad
    let jump = k.has('Space') || k.has('ArrowUp') || k.has('KeyW') || k.has('Enter') || k.has('NumpadEnter') || this.touch.jump;
    let slide = k.has('ArrowDown') || k.has('KeyS') || k.has('ShiftLeft') || this.touch.slide;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0;
      if (Math.abs(ax) > 0.25) move += ax;
      if (gp.buttons[14]?.pressed) move -= 1;
      if (gp.buttons[15]?.pressed) move += 1;
      jump = jump || gp.buttons[0]?.pressed;
      slide = slide || gp.buttons[1]?.pressed || gp.buttons[13]?.pressed;
      if (gp.buttons[9]?.pressed && !this.prevStart) this.pausePressed = true;
      this.prevStart = gp.buttons[9]?.pressed;
    }
    if (!this.enabled) { move = 0; jump = false; slide = false; }
    this.move = Math.max(-1, Math.min(1, move));
    this.jumpPressed = jump && !this.prevJump;
    this.slidePressed = slide && !this.prevSlide;
    this.jumpHeld = jump;
    this.prevJump = jump;
    this.prevSlide = slide;
  }

  consumePause() { const p = this.pausePressed; this.pausePressed = false; return p; }
}
