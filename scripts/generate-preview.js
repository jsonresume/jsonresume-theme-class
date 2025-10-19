import path from 'node:path';
import puppeteer from 'puppeteer';
import { render } from '../index.js';
import resume from '../test/fixture.resume.json' with { type: 'json' };

const html = await render(resume);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({
  width: 779,
  height: 1054,
});
await page.setContent(html);
await page.screenshot({
  path: path.join('assets', 'preview-light.png'),
});
await page.emulateMediaFeatures([
  {
    name: 'prefers-color-scheme',
    value: 'dark',
  },
]);
await page.screenshot({
  path: path.join('assets', 'preview-dark.png'),
});
await browser.close();
