import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const [url = 'http://127.0.0.1:5174', label = 'measurement', limit = '45000'] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 200000, uploadThroughput: 100000 });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver(list => { window.__lcp = list.getEntries().at(-1).startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('.journey-illustration img').first().waitFor();
  let complete = true;
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('.journey-illustration img')].every(img => !img.currentSrc.startsWith('data:') && img.complete && img.naturalWidth > 0), { }, { timeout: Number(limit) });
  } catch { complete = false; }
  const result = await page.evaluate(() => ({
    lcpMs: Math.round(window.__lcp),
    images: [...document.querySelectorAll('.journey-illustration img')].map(img => ({ src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 })),
    imageBytesCompleted: performance.getEntriesByType('resource').filter(e => e.initiatorType === 'img' || /\.(avif|webp|png)(\?|$)/.test(e.name)).reduce((sum, entry) => sum + entry.encodedBodySize, 0),
  }));
  Object.assign(result, { url, label, firstScreenImagesComplete: complete, elapsedMs: Date.now() - start, network: '1.6 Mbps, 100ms RTT, CPU 4x, cache disabled, desktop DPR 1' });
  mkdirSync('performance-results', { recursive: true });
  writeFileSync(`performance-results/${label}.json`, JSON.stringify(result, null, 2));
  await page.screenshot({ path: `performance-results/${label}.png` });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
