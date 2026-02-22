import path from 'node:path';
import { styleText } from 'node:util';
import pa11y from 'pa11y';
import puppeteer from 'puppeteer';

/**
 * @typedef {'light'|'dark'} ColorScheme
 * @typedef {object} TestCase
 * @property {string} name
 * @property {ColorScheme} colorScheme
 */

const PAGE_URL = path.join(import.meta.dirname, 'resume.html');

/** @type {TestCase[]} */
const TEST_CASES = [
  {
    name: 'Light Mode (default)',
    colorScheme: 'light'
  },
  {
    name: 'Dark Mode',
    colorScheme: 'dark'
  },
];

/**
 * @param {import('puppeteer').Browser} browser
 * @param {TestCase} testCase
 * @returns {Promise<any>}
 */
const pa11yRunner = async (browser, testCase) => {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: testCase.colorScheme }
  ]);

  const results = await pa11y(PAGE_URL, {
    standard: 'WCAG2AAA',
    browser,
    page,
  });

  await page.close();
  return results;
};

const browser = await puppeteer.launch();
const results = await Promise.all(TEST_CASES.map(async (testCase) => ({
  name: testCase.name,
  result: await pa11yRunner(browser, testCase),
})));

await browser.close();

let failed = false;

for (const { name, result } of results) {
  if (result.issues.length === 0) {
    continue;
  }

  failed = true;

  for (const issue of result.issues) {
    console.error(
      '%s > %s\n%s %s\n%s %s\n%s %s\n',
      styleText(['blue', 'bold'], name),
      styleText(['red', 'bold'], issue.code),
      styleText('yellow', 'Message:'),
      issue.message,
      styleText('yellow', 'Context:'),
      styleText(['gray', 'italic'], issue.context),
      styleText('yellow', 'Selector:'),
      styleText('gray', issue.selector),
    );
  }
}

if (failed) {
  process.exitCode = 1;
}
