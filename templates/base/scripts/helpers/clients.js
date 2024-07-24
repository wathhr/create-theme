#!/bin/false
// @ts-check
/** @typedef {import('../types').ClientExport} ClientExport */
/** @typedef {import('@schemastore/package').JSONSchemaForNPMPackageJsonFiles} JSONSchemaForNPMPackageJsonFiles */

import fs from 'fs/promises';
import { createRequire } from 'module';
import { join } from 'path';
import { camelToTitleCase } from '../utils/camelToTitleCase.js';

const require = createRequire(import.meta.url);
/** @type {Required<import('../types').ThemeConfig>} */
const config = require('../../theme.config.json');
/** @type {JSONSchemaForNPMPackageJsonFiles} */
const pkg = require('../../package.json');

/** @type {ClientExport} */
export const betterDiscord = {
  name: 'BetterDiscord',
  fileName: config.name + '.theme.css',
  type: 'file',
  compile: ({ content }) => [
    '/*',
    ` * @name ${config.name}`,
    ` * @description ${config.description}`,
    ` * @author ${config.author}`,
    ` * @authorLink https://github.com/${config.author}`,
    ` * @source https://github.com/${config.author}/${config.name}`,
    ` * @version ${config.version}`,
    pkg.license ? ` * @license ${pkg.license}` : '',
    ' */',
    content
  ].filter(Boolean).join('\n'),
};

/** @type {ClientExport} */
export const stylus = {
  name: 'Stylus',
  fileName: config.name + '.user.css',
  type: 'file',
  targets: 'defaults',
  compile: ({ content, props }) => [
    '/* ==UserStyle==',
    `@name ${config.name}`,
    `@namespace https://github.com/${config.author}/${config.name}`,
    `@description ${config.description}`,
    `@author ${config.author}`,
    `@updateURL https://github.com/${config.author}/${config.name}/blob/main/dist/${config.name}.user.css`,
    `@version ${config.version}`,
    pkg.license ? `@license ${pkg.license}` : '',
    // TODO: This does not work. [`type`](https://github.com/openstyles/stylus/wiki/Writing-UserCSS#type) is required
    // TODO: and nested keys also don't work because `props` gives the original object.
    Object.entries(props).map(([key, value]) => `@var ${key} "${camelToTitleCase(key)}" ${value}`).join('\n'),
    '==/UserStyle== */',
    '@-moz-document regexp(\'^https?:\\/\\/(?:(?:ptb|canary)\\.)?discord\\.com\\/(app|activity|channels((?:\\/\\d+)+|\\/@me(\\/\\d*)?)|store(?:\\/skus.*)?|library(?:\\/settings)?|guild-discovery|login|oauth2\\/authorize.*)\\/?$\') {',
    content.replace(/^/gm, '  '),
    '}'
  ].filter(Boolean).join('\n'),
};

/** @type {ClientExport} */
export const replugged = {
  name: 'Replugged',
  fileName: `dev.${config.author}.${config.name}.asar`,
  type: 'asar',
  splash: true,
  async compile({ content, splashContent, tmpDir }) {
    await fs.writeFile(join(tmpDir, 'manifest.json'), JSON.stringify({
      id: `dev.${config.author}.${config.name}`,
      name: config.name,
      author: [
        {
          name: config.author,
          github: config.author,
        }
      ],

      description: config.description,
      version: config.version,
      license: pkg.license ?? 'Unlicense',

      main: 'dist.css',
      splash: splashContent && 'splash.css',
      updater: {
        type: 'github',
        id: `${config.author}/${config.name}`,
      },
      type: 'replugged-theme',
    }));
    await fs.writeFile(join(tmpDir, 'dist.css'), content);
    if (splashContent) await fs.writeFile(join(tmpDir, 'splash.css'), splashContent);
  },
  async postRun() {
    const socket = (await import('../utils/replugged.js')).default;
    if (socket) {
      await socket.reload();
      socket.close();
    }
  }
};

/** @type {ClientExport} */
export const popcorn = {
  name: 'Popcorn',
  fileName: config.name + '.zip',
  type: 'zip',
  splash: true,
  async compile({ content, splashContent, tmpDir }) {
    await fs.writeFile(join(tmpDir, 'index.json'), JSON.stringify({
      id: `${config.author}.${config.name}`,
      description: config.description,
      main: 'dist.css',
      splash: 'splash.css',
    }));
    await fs.writeFile(join(tmpDir, 'dist.css'), content);
    if (splashContent) await fs.writeFile(join(tmpDir, 'splash.css'), splashContent);
  }
};
