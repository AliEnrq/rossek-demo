import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import ffmpeg from 'ffmpeg-static';
import { sceneAt } from '../scene.js';
import { chapters, productUrl } from '../chapters.js';

assert.equal(chapters.length, 8);
assert.equal(sceneAt(0).chapter, 0);
assert.equal(sceneAt(1).chapter, 7);
assert.equal(sceneAt(1).time, 1);
for (let i = 1; i < 8; i++) assert.equal(sceneAt(i / 8).blackout, 1);
assert.deepEqual(sceneAt(-1), sceneAt(0));
assert.deepEqual(sceneAt(2), sceneAt(1));
assert.ok(chapters.reduce((sum, c) => sum + c.end - c.start, 0) > 88);
for (const [i, item] of chapters.entries()) {
  for (const variant of ['', '-mobile']) {
    const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', `public/assets/chapters/scene-${i + 1}${variant}.mp4`], { encoding: 'utf8' });
    assert.match(probe.stderr, /Video: h264/);
    assert.doesNotMatch(probe.stderr, /Audio:/);
    const duration = probe.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
    assert.ok(duration, `Missing clip ${i + 1}`);
    const seconds = +duration[1] * 3600 + +duration[2] * 60 + +duration[3];
    assert.ok(Math.abs(seconds - (item.end - item.start)) < .09, 'Original timing must be preserved');
  }
}
assert.doesNotMatch(await readFile('index.html', 'utf8'), /autoplay|timeline|film-time/);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5190', '--strictPort'], { stdio: 'pipe' });
const url = 'http://127.0.0.1:5190';
let browser;
try {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  await mkdir('test-results', { recursive: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }], ['mobile-small', { width: 360, height: 640 }]]) {
    const context = await browser.newContext({ viewport, isMobile: name !== 'desktop', hasTouch: name !== 'desktop' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `test-results/${name}-hero.png` });
    await page.evaluate(() => {
      window.__playEvents = 0;
      document.querySelectorAll('video').forEach(v => v.addEventListener('play', () => window.__playEvents++));
    });
    async function scroll(progress) {
      await page.evaluate(p => {
        const cinema = document.querySelector('.cinema');
        const stage = document.querySelector('.cinema-stage');
        scrollTo(0, cinema.offsetTop + (cinema.offsetHeight - stage.offsetHeight) * p);
      }, progress);
      const state = sceneAt(progress);
      await page.waitForFunction(({ chapter, time, progress }) => {
        const stage = document.querySelector('.cinema-stage');
        const v = document.querySelectorAll('.shot video')[chapter];
        const expected = Math.min(time * v.duration, v.duration - 1 / 24);
        return +stage.dataset.chapter === chapter && Math.abs(+stage.dataset.progress - progress) < .001 && v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - expected) < .08;
      }, { ...state, progress }, { timeout: 20000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: overflow`);
      return page.$$eval('.shot video', (videos, index) => videos[index].currentTime, state.chapter);
    }
    assert.equal(await page.locator('.timeline, .film-time, video[controls]').count(), 0);
    assert.equal(await page.locator('.shot').count(), 8);
    for (let i = 0; i < 8; i++) {
      await scroll((i + .52) / 8);
      await page.waitForFunction(() => { const image = document.querySelector('#product-image'); return image.complete && image.naturalWidth > 0; });
      assert.equal(await page.locator('#product-name').textContent(), chapters[i].product);
      assert.equal(await page.locator('#product-link').getAttribute('href'), productUrl(chapters[i]));
      const layout = await page.evaluate(() => {
        const product = document.querySelector('.product-panel').getBoundingClientRect();
        const copy = document.querySelector('.scene-copy').getBoundingClientRect();
        const nav = document.querySelector('.cinema-bottom').getBoundingClientRect();
        return { product, copy, nav, height: innerHeight, pinned: document.querySelector('.cinema-stage').getBoundingClientRect().top };
      });
      assert.ok(Math.abs(layout.pinned) < 1);
      assert.ok(layout.product.bottom < layout.nav.top + 1, `${name}: product overlaps navigation`);
      if (name !== 'desktop') assert.ok(layout.copy.bottom < layout.product.top + 1, `${name}: copy overlaps product`);
      if (i === 3 || i === 4) {
        const held = await page.$$eval('.shot video', (v, index) => v[index].currentTime, i);
        await page.waitForTimeout(800);
        assert.equal(await page.$$eval('.shot video', (v, index) => v[index].currentTime, i), held, 'Scene must hold without scroll');
      }
      await page.screenshot({ path: `test-results/${name}-section-${i + 1}.png` });
    }
    const later = await scroll((7 + .8) / 8);
    const earlier = await scroll((7 + .2) / 8);
    assert.ok(later > earlier + 5);
    for (let i = 6; i >= 0; i--) await scroll((i + .5) / 8);
    await scroll(3 / 8);
    assert.ok(await page.$eval('.scene-transition', element => +getComputedStyle(element).opacity > .99));
    assert.ok(await page.$$eval('.callout', elements => elements.every(e => e.hidden)));
    await scroll((4 + .045 + .33 * .91) / 8);
    await page.waitForFunction(() => !document.querySelector('#gojo-callout').hidden);
    await page.screenshot({ path: `test-results/${name}-gojo-callout.png` });
    await scroll((3 + .045 + (5.53 / 12) * .91) / 8);
    await page.waitForFunction(() => [...document.querySelectorAll('.callout')].every(e => !e.hidden));
    const points = await page.$$eval('.callout-point', elements => elements.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; }));
    assert.ok(points.every(([x, y]) => x > 0 && x < viewport.width && y > 0 && y < viewport.height));
    await page.screenshot({ path: `test-results/${name}-duel-callouts.png` });
    await page.getByRole('button', { name: 'Sección 8:' }).click();
    await page.waitForFunction(() => document.querySelector('.cinema-stage').dataset.chapter === '7');
    assert.equal(await page.locator('.chapter-button').last().getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__playEvents), 0);
    assert.ok(await page.$$eval('video', v => v.every(v => v.paused && v.muted && !v.controls)));
    assert.ok(await page.$$eval('video', v => v.filter(v => v.currentSrc).every(v => matchMedia('(max-width:700px)').matches === v.currentSrc.includes('-mobile.mp4'))));
    await page.locator('#collection').scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('link', { name: 'Explorá la colección' }).getAttribute('href'), 'https://www.rossekgainz.com/anime/jujutsu-kaisen1/');
    await page.screenshot({ path: `test-results/${name}-collection.png` });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${name}: eight sections/products, original timing, forward/reverse, hold, transition, callouts and layout OK`);
  }
  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await reduced.newPage();
  await page.goto(url);
  await page.getByRole('button', { name: 'Sección 8:' }).click();
  await page.waitForFunction(() => document.querySelector('.cinema-stage').dataset.chapter === '7');
  assert.ok(await page.$$eval('video', v => v.every(v => !v.getAttribute('src'))));
  assert.equal(await page.$eval('.scene-transition', e => +getComputedStyle(e).opacity), 0);
  assert.equal(await page.locator('#product-name').textContent(), chapters[7].product);
  await reduced.close();
  console.log('Reduced motion: eight static scenes/products; no video downloads OK');
  const failed = await browser.newContext();
  const failurePage = await failed.newPage();
  await failurePage.route('**/*.mp4', route => route.abort());
  await failurePage.goto(url);
  await failurePage.locator('#cinema').scrollIntoViewIfNeeded();
  await failurePage.locator('.media-message').waitFor({ state: 'visible' });
  assert.equal(await failurePage.locator('.shot:not([hidden]) video').evaluate(v => v.classList.contains('has-frame')), false);
  assert.ok(await failurePage.locator('.shot:not([hidden]) img').evaluate(img => img.complete && img.naturalWidth > 0));
  await failurePage.getByRole('button', { name: 'Sección 8:' }).click();
  await failurePage.waitForFunction(() => document.querySelector('.cinema-stage').dataset.chapter === '7');
  assert.equal(await failurePage.locator('#product-link').getAttribute('href'), productUrl(chapters[7]));
  await failed.close();
  console.log('Failed videos: static frames, products and real links remain available OK');
} finally {
  await browser?.close();
  server.kill();
}
