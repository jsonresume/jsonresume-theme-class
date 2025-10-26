/**
 * @fileoverview
 *   Interface for getting messages from our Fluent translations files.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { FluentBundle, FluentResource } from '@fluent/bundle';
import { negotiateLanguages } from '@fluent/langneg';

/**
 * @typedef {string} Locale
 * @typedef {string} MessageKey
 */

const LOCALES_DIR = path.join(import.meta.dirname, 'locales')

export class Messages {

  #locale;
  #defaultLocale;
  /** @type {FluentBundle[]=} */
  #bundles;

  /**
   * @param {string} locale
   * @param {Locale=} defaultLocale
   */
  constructor(locale, defaultLocale) {
    this.#locale = locale;
    this.#defaultLocale = defaultLocale;
  }

  /**
   * Finds the most suited language files and loads the message bundles to
   * memory.
   *
   * @returns Same Messages instances this was invoked on.
   */
  async load() {
    const files = await fs.readdir(LOCALES_DIR);

    const supportedLocales = files.reduce((acc, val) => {
      acc[val.split('.')[0]] = val;
      return acc;
    }, /** @type {Record<string, string>} */({}));

    const selectedLocales = negotiateLanguages(
      [this.#locale],
      Object.keys(supportedLocales),
      { defaultLocale: this.#defaultLocale },
    );

    this.#bundles = await Promise.all(
      selectedLocales.map(async (selectedLocale) => {
        const bundle = new FluentBundle(selectedLocale);
        const localePath = supportedLocales[selectedLocale];
        const contents = await fs.readFile(path.join(LOCALES_DIR, localePath), 'utf-8');
        const resource = new FluentResource(contents);
        bundle.addResource(resource);
        return bundle;
      })
    );

    return this;
  }

  /**
   * @param {MessageKey} key
   * @param {Record<string, any>=} attributes
   */
  t(key, attributes = {}) {
    if (!this.#bundles) {
      throw new Error('Messages#load has not been invoked or resolved yet.');
    }

    for (const bundle of this.#bundles) {
      const message = bundle.getMessage(key);

      if (!message?.value) {
        continue;
      }

      return bundle.formatPattern(message.value, attributes);
    }

    throw new Error(`Unknown or unsupported message key specified: ${key}`);
  }
}
