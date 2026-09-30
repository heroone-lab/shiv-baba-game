import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect,
  ToneMappingEffect, ToneMappingMode, HueSaturationEffect, BrightnessContrastEffect,
} from 'postprocessing';
import { detectQuality, qualitySettings, IS_TOUCH } from './quality.js';
import { loadAssets } from './assets.js';
import { Materials } from './world/materials.js';
import { Environment } from './world/environment.js';
import { Course, ROUND01 } from './world/course.js';
import { Character } from './player/character.js';
import { Player } from './player/player.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Particles } from './fx/particles.js';
import { ROUND_TIME_LIMIT } from './config.js';
import { testCapsule } from './collision.js';
import { loadSettings, saveSettings, RES_PRESETS, RESOLUTIONS, FPS_OPTIONS, pixelRatioFor, FrameLimiter, FpsMeter } from './settings.js';

const $ = (id) => document.getElementById(id);
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const params = new URLSearchParams(location.search);

export class Game {
  constructor() {
    this.q = qualitySettings(detectQuality());
    this.settings = loadSettings();
    // resolution preset decides shadow/reflection/post budgets
    Object.assign(this.q, this.displayBudget());
    this.limiter = new FrameLimiter(this.settings.fps);
    this.fpsMeter = new FpsMeter();
    this.slowTime = 0;
    this.mode = 'loading'; // loading | menu | intro | countdown | play | paused | done
    this.input = new Input();
    this.audio = new Audio();
    this.time = 0;
    this.falls = 0;
    this.bannerTimer = 0;
    this.realTime = 0;
    if (IS_TOUCH) document.body.classList.add('touch');
  }

  async boot() {
    this.initRenderer();
    const assets = await loadAssets(this.q, (p) => {
      $('loadbar').style.width = `${(p * 100).toFixed(0)}%`;
      $('loadtxt').textContent = `Loading course… ${(p * 100).toFixed(0)}%`;
    });
    $('loadtxt').textContent = 'Building the course…';
    await new Promise((r) => setTimeout(r, 30));
    this.buildWorld(assets);
    this.bindUI();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.clock = new THREE.Timer();
    this.renderer.setAnimationLoop((now) => this.frame(now));
    // compile shaders up front so the first frames do not hitch
    this.renderer.compile(this.scene, this.camera);
    this.showScreen('menu');
    this.mode = 'menu';
    setTimeout(() => $('loading').remove(), 500);
    $('fpsMeter').classList.toggle('show', this.settings.showFps);
    if (params.has('autostart')) this.startRound(params.has('skipintro'));
    window.__game = this;
    window.__dbg = { THREE, testCapsule };
    window.__done = true;
  }

  initRenderer() {
    const canvas = $('c');
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
    r.setPixelRatio(this.currentPixelRatio());
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping; // handled by the post stack
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 900);
    this.camera.position.set(0, 4, 13);
  }

  displayBudget() {
    const p = RES_PRESETS[this.settings.resolution];
    // MSAA is expensive on phone GPUs; SMAA gives similar edges for far less
    const msaa = IS_TOUCH ? 0 : p.msaa;
    return { shadowMap: p.shadowMap, waterRes: p.waterRes, bloom: p.bloom, msaa };
  }

  currentPixelRatio() {
    if (params.has('pr')) return +params.get('pr');
    return pixelRatioFor(this.settings.resolution).pixelRatio;
  }

  initPost() {
    if (params.has('nopost')) return;
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    const c = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: this.q.msaa });
    c.addPass(new RenderPass(this.scene, this.camera));
    const fx = [];
    if (this.q.bloom) fx.push(new BloomEffect({ luminanceThreshold: 0.9, luminanceSmoothing: 0.25, intensity: 0.55, mipmapBlur: true, radius: 0.7 }));
    fx.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    fx.push(new HueSaturationEffect({ saturation: 0.1 }));
    fx.push(new BrightnessContrastEffect({ brightness: 0.02, contrast: 0.07 }));
    fx.push(new VignetteEffect({ darkness: 0.42, offset: 0.32 }));
    c.addPass(new EffectPass(this.camera, ...fx));
    if (!this.q.msaa) c.addPass(new EffectPass(this.camera, new SMAAEffect()));
    this.composer = c;
  }

  buildWorld(assets) {
    this.mats = new Materials(assets);
    this.env = new Environment(this.renderer, this.scene, assets, this.mats, this.q);
    this.course = new Course(this.scene, this.mats, ROUND01);
    this.character = new Character(assets.hero);
    this.scene.add(this.character.root);
    this.particles = new Particles(this.scene);
    this.cam = new FollowCamera(this.camera);
    this.player = new Player(this.character, this.course, {
      jump: () => this.audio.jump(),
      land: (v) => { this.audio.land(v); if (v > 9) this.cam.shake(0.3); },
      slide: () => this.audio.slide(),
      bounce: () => { this.audio.bounce(); this.cam.shake(0.3); },
      hit: (o, force, pt) => {
        this.audio.hit(force);
        this.cam.shake(Math.min(1.4, force / 8));
        this.banner(['OUCH!', 'WHAM!', 'BOOM!', 'OOF!'][Math.floor(Math.random() * 4)], 0.9);
        navigator.vibrate?.(60);
      },
      splash: (pos, v) => {
        this.audio.splash(v);
        this.particles.splash(pos, Math.min(1.6, 0.6 + v / 12));
        this.env.water.addRipple(pos.x, pos.z, 1.2);
        this.cam.shake(0.5);
        this.banner('SPLASH!', 1.5);
        this.falls++;
        $('falls').textContent = this.falls;
      },
      drowned: () => this.respawn(),
      finish: () => this.finishRound(),
    });
    this.player.respawn(this.course.checkpoints[0]);
    this.player.freeze();
    this.cam.snap(this.player, this.course);
    this.initPost();
    this.buildProgressTicks();
    this.cpIndex = 0;
    const best = localStorage.getItem('sb_best_L01');
    if (best) $('best01').textContent = `Best ${fmt(+best)}`;
  }

  buildProgressTicks() {
    const track = $('ticks');
    const L = this.course.finishX - this.course.checkpoints[0].x;
    for (const o of this.course.obstacles) {
      const i = document.createElement('i');
      i.style.left = `${((o.x - this.course.checkpoints[0].x) / L) * 100}%`;
      track.appendChild(i);
    }
    const f = document.createElement('i');
    f.className = 'fin'; f.style.left = '100%';
    track.appendChild(f);
  }

  bindUI() {
    this.input.bindTouch($('touch'));
    const unlock = () => this.audio.unlock();
    addEventListener('pointerdown', unlock, { passive: true });
    addEventListener('keydown', unlock);
    $('play').onclick = () => this.startRound();
    for (const r of document.querySelectorAll('.round[data-round]')) r.onclick = () => this.startRound();
    $('pauseBtn').onclick = () => this.togglePause();
    for (const b of document.querySelectorAll('[data-act]')) {
      b.onclick = () => {
        const a = b.dataset.act;
        if (a === 'resume') this.togglePause();
        if (a === 'restart') this.startRound(true);
        if (a === 'menu') this.toMenu();
      };
    }
    $('openSettings').onclick = () => this.openSettings('menu');
    $('pauseSettings').onclick = () => this.openSettings('pause');
    this.buildSettingsUI();
  }

  // ------------------------------------------------------------------ settings
  buildSettingsUI() {
    const seg = (id, values, label, current, onPick) => {
      const box = $(id);
      box.innerHTML = '';
      for (const v of values) {
        const b = document.createElement('button');
        b.textContent = label(v);
        b.className = v === current() ? 'on' : '';
        b.onclick = () => { onPick(v); for (const x of box.children) x.classList.toggle('on', x === b); this.refreshSettingsInfo(); };
        box.appendChild(b);
      }
    };
    seg('setRes', RESOLUTIONS, (v) => `${v}p`, () => this.settings.resolution, (v) => { this.settings.resolution = v; this.applyDisplay(); });
    seg('setFps', FPS_OPTIONS, (v) => `${v} FPS`, () => this.settings.fps, (v) => { this.settings.fps = v; this.applyDisplay(); });
    const saved = localStorage.getItem('sb_quality');
    seg('setDetail', ['auto', 'high', 'low'], (v) => (v === 'auto' ? `Auto (${detectQuality() === 'high' && !saved ? 'High' : saved ? saved : 'Low'})` : v === 'high' ? 'High' : 'Low'),
      () => saved || 'auto', (v) => {
        if (v === 'auto') localStorage.removeItem('sb_quality'); else localStorage.setItem('sb_quality', v);
        if ((v === 'auto' ? detectQuality() : v) !== this.q.tier) { $('setNote').textContent = 'Reloading textures…'; setTimeout(() => location.reload(), 250); }
      });
    seg('setFpsShow', [true, false], (v) => (v ? 'On' : 'Off'), () => this.settings.showFps, (v) => { this.settings.showFps = v; this.applyDisplay(); });
    seg('setSound', [true, false], (v) => (v ? 'On' : 'Off'), () => !this.audio.muted, (v) => this.audio.setMuted(!v));
    $('settingsBack').onclick = () => this.closeSettings();
    this.refreshSettingsInfo();
  }

  refreshSettingsInfo() {
    const { renderShort, nativeShort } = pixelRatioFor(this.settings.resolution);
    const w = Math.round(renderShort * Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight));
    const capped = renderShort < this.settings.resolution;
    $('setNote').textContent = `Rendering ${w} × ${renderShort}` + (capped ? ` (your screen is ${nativeShort}p, so ${this.settings.resolution}p is capped)` : '') +
      ` · target ${this.settings.fps} FPS`;
  }

  openSettings(from) {
    this.settingsFrom = from;
    this.showScreen('settings');
    this.refreshSettingsInfo();
  }

  closeSettings() {
    this.showScreen(this.settingsFrom === 'pause' ? 'pause' : 'menu');
  }

  /** Apply resolution / FPS / meter settings live, without reloading. */
  applyDisplay() {
    saveSettings(this.settings);
    this.limiter.set(this.settings.fps);
    const budget = this.displayBudget();
    const needPost = budget.bloom !== this.q.bloom || budget.msaa !== this.q.msaa;
    const sun = this.env.sun;
    if (budget.shadowMap !== this.q.shadowMap) {
      sun.shadow.mapSize.set(budget.shadowMap, budget.shadowMap);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    if (budget.waterRes !== this.q.waterRes) {
      this.env.water.mesh.material.uniforms.mirrorSampler.value.renderTarget?.setSize(budget.waterRes, budget.waterRes);
    }
    Object.assign(this.q, budget);
    this.renderer.setPixelRatio(this.currentPixelRatio());
    if (needPost) this.initPost();
    this.resize();
    $('fpsMeter').classList.toggle('show', this.settings.showFps);
    this.slowTime = 0;
  }

  showScreen(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id);
  }

  showHud(on) {
    $('hud').classList.toggle('show', on);
    $('touch').classList.toggle('show', on);
  }

  banner(html, dur = 1.2) {
    const b = $('banner');
    b.innerHTML = html;
    b.classList.add('show');
    this.bannerTimer = dur;
  }

  async fade(on) {
    $('fade').classList.toggle('on', on);
    await new Promise((r) => setTimeout(r, 360));
  }

  // ------------------------------------------------------------------ flow
  async startRound(skipIntro = false) {
    this.audio.unlock();
    this.showScreen(null);
    this.showHud(false);
    this.course.time = 0;
    this.time = 0;
    this.falls = 0;
    $('falls').textContent = '0';
    $('timer').textContent = fmt(0);
    $('timer').classList.remove('warn');
    this.cpIndex = 0;
    this.player.maxX = 0;
    this.player.respawn(this.course.checkpoints[0]);
    this.player.freeze();
    if (!skipIntro) {
      this.mode = 'intro';
      this.cam.flyover(this.course.finishX + 4, this.course.checkpoints[0].x + 2, 4.2);
      this.banner(`${ROUND01.title}<small>${ROUND01.subtitle}</small>`, 3.6);
      await this.wait(4.3);
    }
    this.cam.cine = null;
    this.cam.snap(this.player, this.course);
    this.showHud(true);
    this.mode = 'countdown';
    for (const n of ['3', '2', '1']) {
      this.banner(n, 0.8); this.audio.beep(false);
      await this.wait(params.has('fastcount') ? 0.05 : 0.85);
    }
    this.banner('GO!', 0.9); this.audio.beep(true); this.audio.crowd(1.2, 'cheer');
    this.player.release();
    this.mode = 'play';
  }

  wait(sec) {
    return new Promise((res) => {
      const end = this.realTime + sec;
      const tick = () => (this.realTime >= end ? res() : requestAnimationFrame(tick));
      tick();
    });
  }

  async respawn() {
    if (this.mode !== 'play') return;
    await this.fade(true);
    const cp = this.course.checkpointFor(this.player.maxX);
    this.player.respawn(cp);
    this.cam.snap(this.player, this.course);
    await this.fade(false);
  }

  finishRound() {
    this.mode = 'done';
    this.audio.fanfare();
    this.banner('FINISH!', 2.2);
    this.particles.confetti(this.player.pos.x, this.player.pos.y + 3, 0);
    const t = this.time;
    const key = 'sb_best_L01';
    const prev = +localStorage.getItem(key) || Infinity;
    if (t < prev) localStorage.setItem(key, String(t));
    setTimeout(() => this.showResult(true), 2600);
  }

  timeUp() {
    this.mode = 'done';
    this.audio.fail();
    this.banner('TIME UP!<small>Exhausted…</small>', 2.5);
    this.player.freeze();
    this.character.play('Defeated', { fade: 0.4, once: true });
    setTimeout(() => this.showResult(false), 2600);
  }

  showResult(won) {
    const best = +localStorage.getItem('sb_best_L01');
    $('resTitle').textContent = won ? 'ROUND COMPLETE!' : 'TIME UP!';
    $('resTime').textContent = won ? fmt(this.time) : '—';
    $('resFalls').textContent = this.falls;
    $('resBest').textContent = best ? fmt(best) : '—';
    const stars = won ? (this.falls === 0 && this.time < 45 ? 3 : this.falls <= 2 && this.time < 75 ? 2 : 1) : 0;
    const star = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z" fill="currentColor"/></svg>';
    $('stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">${star}</span>`).join('');
    if (best) $('best01').textContent = `Best ${fmt(best)}`;
    this.showHud(false);
    this.showScreen('result');
  }

  togglePause() {
    if (this.mode === 'play') { this.mode = 'paused'; this.showScreen('pause'); }
    else if (this.mode === 'paused') { this.mode = 'play'; this.showScreen(null); }
  }

  toMenu() {
    this.mode = 'menu';
    this.showHud(false);
    this.showScreen('menu');
    this.player.respawn(this.course.checkpoints[0]);
    this.player.freeze();
  }

  // ------------------------------------------------------------------ loop
  frame(now = performance.now()) {
    if (!this.limiter.shouldRender(now)) return;
    this.clock.update(now);
    const raw = this.clock.getDelta();
    this.realTime += raw;
    this.trackFps(now);
    const dt = Math.min(raw, 1 / 10);
    if (this.frozenForTest) { this.render(dt); return; }
    this.input.update();
    if (this.input.consumePause()) this.togglePause();
    // Simulate in equal sub-steps no longer than 1/60 s so gameplay feels
    // identical at 30, 48 or 60 FPS; jump/slide presses fire on the first step only.
    const n = Math.max(1, Math.ceil(dt * 60 - 1e-3));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.step(h, i === 0 ? this.input : { ...this.input, jumpPressed: false, slidePressed: false });
    }
    this.visuals(dt);
    this.render(dt);
  }

  trackFps(now) {
    const fps = this.fpsMeter.tick(now);
    if (this.settings.showFps && (!this.fpsShownAt || now - this.fpsShownAt > 250)) {
      this.fpsShownAt = now;
      const el = $('fpsMeter');
      const ratio = fps / this.settings.fps;
      el.textContent = `${fps.toFixed(0)} FPS · ${pixelRatioFor(this.settings.resolution).renderShort}p`;
      el.dataset.level = ratio > 0.93 ? 'good' : ratio > 0.75 ? 'ok' : 'bad';
    }
    // gentle hint if the device cannot hold the chosen target during play
    if (this.mode === 'play' && this.fpsMeter.times.length > 20) {
      this.slowTime = fps < this.settings.fps * 0.8 ? this.slowTime + 1 : 0;
      if (this.slowTime === 240 && !this.slowHinted) {
        this.slowHinted = true;
        this.banner(`<small>Device can't hold ${this.settings.fps} FPS here.<br>Try a lower resolution in Settings.</small>`, 3.5);
      }
    }
  }

  render(dt) {
    this.updateHud(dt);
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  /** Test hook: run the simulation headlessly with a scripted input function. */
  simulate(seconds, script, step = 1 / 60) {
    this.frozenForTest = true;
    const log = [];
    let t = 0, prevJ = false, prevS = false;
    while (t < seconds) {
      const s = script(t, this.player) || {};
      const inp = { move: s.move || 0, jumpHeld: !!s.jump, jumpPressed: !!s.jump && !prevJ, slidePressed: !!s.slide && !prevS };
      prevJ = !!s.jump; prevS = !!s.slide;
      this.realTime += step;
      this.step(step, inp);
      this.visuals(step);
      t += step;
      if (s.log) log.push(s.log);
    }
    return log;
  }

  /** Gameplay simulation step (called 1–N times per rendered frame). */
  step(dt, input) {
    if (this.mode === 'paused') return;
    this.course.update(dt);
    if (this.mode === 'play') {
      this.time += dt;
      if (ROUND_TIME_LIMIT - this.time <= 0) this.timeUp();
    }
    this.player.update(dt, this.mode === 'play' ? input : IDLE_INPUT);
    this.updateCheckpoint();
  }

  /** Per-rendered-frame work: camera, particles, water, flags, HUD text. */
  visuals(dt) {
    if (this.mode === 'paused') return;
    if (this.mode === 'play' || this.mode === 'done') {
      $('timer').textContent = fmt(this.time);
      $('timer').classList.toggle('warn', ROUND_TIME_LIMIT - this.time < 20);
    }
    this.particles.update(dt);
    if (this.mode === 'menu') this.menuCamera(dt);
    else this.cam.update(dt, this.player, this.course);
    this.env.update(dt, this.cam.focus);
  }

  menuCamera(dt) {
    this.menuT = (this.menuT || 0) + dt;
    const x = 30 + Math.sin(this.menuT * 0.06) * 40;
    this.camera.position.set(x - 6, 6.5, 19);
    this.camera.lookAt(x + 4, 2.2, -2);
    this.cam.focus.set(x, 2, 0);
  }

  updateCheckpoint() {
    const cps = this.course.checkpoints;
    const p = this.player;
    if (this.mode !== 'play' || p.state !== 'ground') return;
    let idx = this.cpIndex;
    while (idx + 1 < cps.length && p.pos.x >= cps[idx + 1].x) idx++;
    if (idx > this.cpIndex) {
      this.cpIndex = idx;
      this.audio.checkpoint();
      this.banner('<small>CHECKPOINT</small>', 0.8);
    }
  }

  updateHud(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) $('banner').classList.remove('show');
    }
    const x0 = this.course.checkpoints[0].x, L = this.course.finishX - x0;
    const u = THREE.MathUtils.clamp((this.player.pos.x - x0) / L, 0, 1);
    $('runner').style.left = `${u * 100}%`;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 52 : 40;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.currentPixelRatio());
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    if ($('settings')?.classList.contains('show')) this.refreshSettingsInfo();
  }
}

const IDLE_INPUT = { move: 0, jumpPressed: false, jumpHeld: false, slidePressed: false };
