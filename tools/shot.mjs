// Headless test helper. Starts a Vite dev server in-process, then for each job
// loads a page, waits for window.__done, optionally runs actions, and screenshots.
// Usage: node tools/shot.mjs jobs.json   OR   node tools/shot.mjs <path> <out.png> [w] [h] [waitMs]
import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';

let jobs;
const a = process.argv.slice(2);
if (a[0].endsWith('.json')) jobs = JSON.parse(fs.readFileSync(a[0], 'utf8'));
else jobs = [{ path: a[0], out: a[1], w: +(a[2] || 900), h: +(a[3] || 900), wait: +(a[4] || 0) }];

const server = await createServer({ logLevel: 'error', server: { port: 5199 } });
await server.listen();
const base = 'http://localhost:5199';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.w || 900, height: job.h || 900 }, hasTouch: !!job.touch, isMobile: !!job.touch });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(base + job.path);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 240000 }).catch(() => logs.push('timeout waiting __done'));
  for (const step of job.steps || []) {
    if (step.wait) await page.waitForTimeout(step.wait);
    if (step.until) await page.waitForFunction(step.until, null, { timeout: 240000, polling: 250 }).catch(() => logs.push('until timeout: ' + step.until));
    if (step.eval) logs.push('eval: ' + JSON.stringify(await page.evaluate(step.eval)));
    if (step.key) await page.keyboard.press(step.key);
    if (step.down) await page.keyboard.down(step.down);
    if (step.up) await page.keyboard.up(step.up);
    if (step.click) await page.click(step.click).catch((e) => logs.push('click fail ' + e.message));
    if (step.shot) await page.screenshot({ path: step.shot, timeout: 180000 });
  }
  if (job.wait) await page.waitForTimeout(job.wait);
  const info = await page.evaluate(() => window.__info);
  if (job.out) await page.screenshot({ path: job.out, timeout: 180000 });
  console.log('==', job.out || job.path, JSON.stringify(info));
  console.log(logs.slice(-40).join('\n'));
  await page.close();
}
await browser.close();
await server.close();
