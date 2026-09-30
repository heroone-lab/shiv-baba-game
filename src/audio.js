// Procedural sound effects (Web Audio) — no audio files needed.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('sb_muted') === '1';
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbience();
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('sb_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

  noiseBurst({ dur = 0.4, freq = 1000, q = 1, type = 'bandpass', gain = 0.5, attack = 0.005, sweep = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  tone({ freq = 440, dur = 0.2, type = 'sine', gain = 0.3, slide = 0, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  jump() { this.noiseBurst({ dur: 0.18, freq: 900, sweep: 2.5, gain: 0.18 }); this.tone({ freq: 260, dur: 0.12, slide: 1.8, gain: 0.08 }); }
  land(v = 5) { this.noiseBurst({ dur: 0.12, freq: 250, type: 'lowpass', gain: Math.min(0.5, 0.08 + v * 0.03) }); }
  slide() { this.noiseBurst({ dur: 0.55, freq: 1800, q: 0.6, sweep: 0.4, gain: 0.16 }); }
  bounce() { this.tone({ freq: 180, dur: 0.3, slide: 2.2, type: 'triangle', gain: 0.3 }); }
  hit(force = 8) {
    this.noiseBurst({ dur: 0.25, freq: 160, type: 'lowpass', gain: 0.7 });
    this.tone({ freq: 110, dur: 0.35, slide: 0.5, type: 'sine', gain: 0.5 });
    this.tone({ freq: 320, dur: 0.4, slide: 0.6, type: 'triangle', gain: 0.15 * Math.min(1, force / 8) });
    this.crowd(0.5, 'ooh');
  }
  splash(v = 8) {
    this.noiseBurst({ dur: 1.2, freq: 1200, q: 0.4, sweep: 0.25, gain: Math.min(0.9, 0.35 + v * 0.04), attack: 0.01 });
    this.noiseBurst({ dur: 0.5, freq: 300, type: 'lowpass', gain: 0.5 });
    this.crowd(0.9, 'laugh');
  }
  beep(high = false) { this.tone({ freq: high ? 1046 : 523, dur: high ? 0.5 : 0.18, type: 'square', gain: 0.12 }); }
  checkpoint() { [659, 880].forEach((f, i) => this.tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.18, delay: i * 0.09 })); }
  fanfare() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: i === 5 ? 0.8 : 0.2, type: 'sawtooth', gain: 0.1, delay: i * 0.13 }));
    this.crowd(2.5, 'cheer');
  }
  fail() { [392, 330, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.35, type: 'triangle', gain: 0.18, delay: i * 0.25 })); }

  crowd(dur = 1, kind = 'cheer') {
    if (!this.ctx) return;
    const f = kind === 'ooh' ? 420 : kind === 'laugh' ? 900 : 1300;
    for (let i = 0; i < 3; i++) this.noiseBurst({ dur: dur * (0.7 + i * 0.2), freq: f * (0.8 + i * 0.25), q: 1.2, gain: 0.07, attack: 0.08 });
  }

  startAmbience() {
    // soft crowd murmur + lapping water, looping forever at low volume
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.5;
    const g = this.ctx.createGain(); g.gain.value = 0.035;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
    const lg = this.ctx.createGain(); lg.gain.value = 0.015;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start(); lfo.start();
  }
}
