// Screenshot grid of an episode: node tools/tests/ep_views.mjs E3 [count] [q]
// Starts Vite + Playwright (SwiftShader), puts the runner in front of evenly spread
// obstacles and saves shots/views_<id>.png (4 columns).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import sharp from 'sharp';

const [id = 'E3', countArg = '12', q = 'high'] = process.argv.slice(2);
const count = +countArg;
const server = await createServer({ logLevel: 'error', server: { port: 5199 } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:5199/index.html?q=${q}&res=720&unlockall&round=${id}`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 240000 });
const xs = await page.evaluate(({ id, count }) => {
  const g = __game; g.loadRound(id); g.showScreen(null); g.showHud(true); g.mode = 'play'; g.player.release();
  const obs = g.course.obstacles.map((o) => o.x).sort((a, b) => a - b);
  const pick = [];
  for (let i = 0; i < count; i++) pick.push(obs[Math.floor((i * (obs.length - 1)) / Math.max(1, count - 1))]);
  return pick;
}, { id, count });
const tiles = [];
for (const [i, x] of xs.entries()) {
  await page.evaluate((x) => {
    const g = __game; const c = g.course;
    let sx = x - 3.2;
    let d = c.supportAt(sx, 0);
    for (let k = 0; k < 30 && !d; k++) { sx -= 0.4; d = c.supportAt(sx, 0); }
    g.time = 0; g.mode = 'play';
    g.player.respawn({ x: sx, y: d ? d.topAt(sx) : c.def.top });
    g.player.maxX = sx;
    g.simulate(0.35, () => ({ move: 1 }));
    g.cam.snap(g.player, c);
    for (let k = 0; k < 8; k++) g.cam.update(1 / 30, g.player, c);
    g.visuals(1 / 60); g.render(1 / 60);
  }, x);
  await page.waitForTimeout(150);
  const f = `shots/_v${i}.png`;
  await page.screenshot({ path: f });
  tiles.push(f);
}
const cols = 4, rows = Math.ceil(tiles.length / cols);
const comps = tiles.map((f, i) => ({ input: f, left: (i % cols) * 640, top: Math.floor(i / cols) * 360 }));
await sharp({ create: { width: cols * 640, height: rows * 360, channels: 3, background: '#000' } }).composite(comps).png().toFile(`shots/views_${id}.png`);
const small = `shots/views_${id}_s.jpg`;
await sharp(`shots/views_${id}.png`).resize(1600).jpeg({ quality: 82 }).toFile(small);
console.log('saved', small, 'errors:', errs.slice(0, 8));
await browser.close();
await server.close();
