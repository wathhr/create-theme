#!/bin/false

// @ts-check
/** @typedef {import('../types').ClientExport} ClientExport */
/** @typedef {import('@schemastore/package').JSONSchemaForNPMPackageJsonFiles} JSONSchemaForNPMPackageJsonFiles */

import fs from 'fs/promises';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
/** @type {Required<import('../types').ThemeConfig>} */
const config = require('../../theme.config.json');
/** @type {JSONSchemaForNPMPackageJsonFiles} */
const pkg = require('../../package.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../../');

/** @type {ClientExport} */
export const betterDiscord = {
  name: 'BetterDiscord',
  fileName: config.name + '.theme.css',
  type: 'file',
  compile: (content) => [
    '/*',
    ` * @name ${config.name}`,
    ` * @description ${config.description}`,
    ` * @author ${config.author}`,
    ` * @authorLink https://github.com/${config.author}`,
    ` * @source https://github.com/${config.author}/${config.name}`,
    ` * @version ${config.version}`,
    pkg.license ? ` * @license ${pkg.license}` : '',
    ' */',
    '',
    content
  ].filter(Boolean).join('\n'),
};

/** @type {ClientExport} */
export const stylus = {
  name: 'Stylus',
  fileName: config.name + '.user.css',
  type: 'file',
  targets: 'defaults',
  compile: (content) => [
    '/* ==UserStyle==',
    `@name ${config.name}`,
    `@namespace https://github.com/${config.author}/${config.name}`,
    `@description ${config.description}`,
    `@author ${config.author}`,
    `@updateURL https://github.com/${config.author}/${config.name}/blob/main/dist/${config.name}.user.css`,
    `@version ${config.version}`,
    pkg.license ? `@license ${pkg.license}` : '',
    '==/UserStyle== */',
    '',
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
      license: pkg.license,

      main: 'dist.css',
      splash: splashContent && 'splash.css',
      updater: {
        type: 'github',
        id: `${config.author}/${config.name}`,
      },
      type: 'replugged-theme',
    }));
    await fs.writeFile(join(tmpDir, 'dist.css'), content);
    await fs.writeFile(join(tmpDir, 'splash.css'), splashContent ?? '');
  },
  async postRun() {
    // TODO: The asar file is being used while replugged is opened, a workaround might be to just copy the folder when building?
    // const repluggedPath = join((() => {
    //   switch (process.platform) {
    //     case 'win32': return join(process.env.APPDATA ?? '');
    //     case 'darwin': return join(process.env.HOME ?? '', 'Library', 'Application Support');
    //     default: {
    //       if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME);
    //       return join(process.env.HOME ?? '', '.config');
    //     }
    //   }
    // })(), 'replugged');
    // if (!existsSync(repluggedPath)) return console.warn('Replugged folder not found. Skipping installation and reload.');

    // const filePath = join(repluggedPath, 'themes', replugged.fileName);
    // if (existsSync(filePath)) await fs.rm(filePath, { force: true });
    // fs.copyFile(join(root, 'dist', replugged.fileName), filePath);

    const socket = (await import('../utils/replugged.js')).default;
    if (socket) {
      await socket.reload();
      socket.close();
    }
  }
};
