// @ts-check
/** @typedef {import('../types').ClientExport} ClientExport */

import fs from 'node:fs/promises';
import { join } from 'node:path';

/** @type {ClientExport} */
export function betterDiscord(config, pkg) {
  return {
    name: 'BetterDiscord',
    fileName: config.name + '.theme.css',
    type: 'file',
    compile: (content) => [
      '/*',
      ` * @name ${config.name}`,
      ` * @description ${config.description}`,
      ` * @author ${config.author}`,
      ` * @source https://github.com/${config.author}/${config.name}`,
      ` * @version ${config.version}`,
      pkg.license || ` * @license ${pkg.license}`,
      ' */',
      '',
      content
    ].join('\n'),
  };
}

/** @type {ClientExport} */
export function stylus(config, pkg) {
  return {
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
      pkg.license || `@license ${pkg.license}`,
      '==/UserStyle== */',
      '',
      '@-moz-document regexp(\'^https?:\\/\\/(?:(?:ptb|canary)\\.)?discord\\.com\\/(app|activity|channels((?:\\/\\d+)+|\\/@me(\\/\\d*)?)|store(?:\\/skus.*)?|library(?:\\/settings)?|guild-discovery|login|oauth2\\/authorize.*)\\/?$\') {',
      content.replace(/^(?!\s*$)/gm, '  '),
      '}'
    ].join('\n'),
  };
}

/** @type {ClientExport} */
export function replugged(config) {
  return {
    name: 'Replugged',
    fileName: `dev.${config.author}.${config.name}.asar`,
    type: 'asar',
    async compile({ content, root, tmpDir }) {
      await fs.copyFile(join(root, 'manifest.json'), join(tmpDir, 'manifest.json'));
      await fs.writeFile(join(tmpDir, 'dist.css'), content);
    },
    async postRun() {
      const socket = (await import('../utils/replugged.js')).default;
      if (socket) await socket.reload();
    }
  };
}
