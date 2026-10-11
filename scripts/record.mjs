import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

await mkdir('delivery', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'delivery/raw', size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const recording = page.video();
await page.goto('http://127.0.0.1:5173/');
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('.shot video').readyState >= 2);
await page.waitForTimeout(1600);

async function travel(target, duration) {
  await page.evaluate(async ({ target, duration }) => {
    const start = scrollY;
    const began = performance.now();
    await new Promise(resolve => {
      function frame(now) {
        const p = Math.min(1, (now - began) / duration);
        scrollTo(0, start + (target - start) * p);
        if (p < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, { target, duration });
}
const dimensions = await page.evaluate(() => {
  const cinema = document.querySelector('.cinema');
  const stage = document.querySelector('.cinema-stage');
  return { start: cinema.offsetTop, travel: cinema.offsetHeight - stage.offsetHeight, end: document.documentElement.scrollHeight - innerHeight };
});
const point = p => dimensions.start + dimensions.travel * p;
await travel(point(0), 1200);
for (let index = 0; index < 8; index++) {
  await travel(point((index + 0.5) / 8), 2900);
  await page.waitForFunction(() => { const image = document.querySelector('#product-image'); return image.complete && image.naturalWidth > 0; });
  await page.waitForTimeout(650);
  if (index === 3) {
    // A reverse move and hold demonstrate actual scroll control.
    await travel(point((index + 0.25) / 8), 1100);
    await page.waitForTimeout(800);
  }
  await travel(point((index + 0.95) / 8), 1700);
}
await travel(point(1), 500);
await travel(dimensions.end, 1400);
await page.waitForTimeout(1800);
await context.close();
const source = await recording.path();
const result = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', source, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'delivery/ROSSEK-demo.mp4', '-y'], { encoding: 'utf8' });
await browser.close();
if (result.status !== 0) throw new Error(result.stderr);
console.log('Browser recording saved: delivery/ROSSEK-demo.mp4');
