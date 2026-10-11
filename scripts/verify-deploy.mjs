import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { chromium } from '@playwright/test';

// Serve the compiled files under a prefix, rejecting root-relative requests.
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ttf': 'font/ttf' };
const browser = await chromium.launch();
try {
  for (const prefix of ['/', '/testrossek/']) {
    const server = createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
        const path = resolve(root, pathname.slice(prefix.length) || 'index.html');
        if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
        const data = await readFile(path);
        const headers = { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        if (range) {
          const start = +range[1];
          const end = range[2] ? Math.min(+range[2], data.length - 1) : data.length - 1;
          response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
          response.end(data.subarray(start, end + 1));
        } else {
          response.writeHead(200, { ...headers, 'Content-Length': data.length });
          response.end(data);
        }
      } catch { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}${prefix}`;
    const page = await browser.newPage();
    const failures = [];
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    page.on('pageerror', error => failures.push(error.message));
    try {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.fonts.check('24px Anton')));
      for (let chapter = 0; chapter < 8; chapter++) {
        await page.locator('.chapter-button').nth(chapter).click();
        await page.waitForFunction(index => {
          const stage = document.querySelector('.cinema-stage');
          const v = document.querySelectorAll('.shot video')[index];
          const image = document.querySelector('#product-image');
          return +stage.dataset.chapter === index && v.readyState >= 2 && !v.seeking && v.currentTime > .2 && image.complete && image.naturalWidth > 0;
        }, chapter);
        assert.ok(await page.locator('#product-image').evaluate((image, base) => image.src.startsWith(base), url));
        assert.ok(await page.locator('.shot:not([hidden]) video').evaluate((video, base) => video.currentSrc.startsWith(base), url));
      }
      assert.deepEqual(failures, [], 'All compiled assets must load under the deployment prefix');
      console.log(`Production build at ${prefix}: eight videos/products, fonts and asset paths OK`);
    } catch (error) {
      console.log(await page.evaluate(() => ({ chapter: document.querySelector('.cinema-stage').dataset.chapter, videos: [...document.querySelectorAll('video')].map(v => ({ src: v.currentSrc, ready: v.readyState, seeking: v.seeking, time: v.currentTime, error: v.error?.message })) })), failures);
      throw error;
    } finally {
      await page.close();
      await new Promise(resolve => server.close(resolve));
    }
  }
} finally { await browser.close(); }
