// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import sass, { compile } from 'sass';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { existsSync, statSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);

/** @type {import('../types').ThemeConfig} */
const config = require('../../theme.config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../..');

/**
 * @param {string} string
 * @returns {RegExp}
 */
function stringToRegex(string) {
  const flagRegex = /(?<=\/)[gmiyusd]*$/;
  const expression = string.replace(flagRegex, '').slice(1).slice(0, -1);
  const flags = string.match(flagRegex)?.[0];
  return new RegExp(expression, flags);
}

/** @type {PreprocessExport} */
export const preprocess = (file, { args }) => {
  const aliasRegex = new RegExp(`^(?<main>${Object.keys(config.paths ?? {}).join('|')})(?<path>.*)`);

  const { css } = compile(file, {
    functions: {
      'regex-test($string, $regex)': (args) => {
        const params = args.map((p) => p.toString().replace(/^['"]|['"]$/g, ''));
        const string = params[0];
        const regex = stringToRegex(params[1]);

        const match = regex.test(string);
        return match ? sass.sassTrue : sass.sassFalse;
      },
      'regex-replace($string, $regex, $replace)': (args) => {
        const params = args.map((p) => p.toString().replace(/^['"]|['"]$/g, ''));
        const string = params[0];
        const regex = stringToRegex(params[1]);
        const replace = params[2];

        const replaced = string.replace(regex, replace);
        return new sass.SassString(replaced);
      },
    },
    importers: [{
      findFileUrl(url) {
        if (!config.paths) return null;

        const match = url.match(aliasRegex);
        const mainGroup = match?.groups?.main;
        if (!match || !mainGroup) return null;
        if (!(mainGroup in (config.paths ?? {}))) return null;
        const pathGroup = match.groups?.path;

        const possiblePaths = config.paths[mainGroup]
          .map((path) => join(root, path, pathGroup ?? ''))
          .filter((path) => existsSync(path) && statSync(path).isFile());

        if (possiblePaths.length === 0) throw `No valid paths for ${url}`;

        return new URL(pathToFileURL(possiblePaths[0]));
      }
    }],
    style: (process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !args.watch)
      ? 'expanded'
      : 'compressed',
  });

  return css;
};
