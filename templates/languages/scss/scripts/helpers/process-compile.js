// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { pathToFileURL } from 'url';
import sass, { compile } from 'sass';
import resolveAlias from '../utils/resolveAlias.js';

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
        const resolvedPath = resolveAlias(url);
        if (resolveAlias(url) === url) return null;
        url = resolvedPath ?? url;

        return new URL(pathToFileURL(url));
      }
    }],
    style: (process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !args.watch)
      ? 'expanded'
      : 'compressed',
  });

  return css;
};
