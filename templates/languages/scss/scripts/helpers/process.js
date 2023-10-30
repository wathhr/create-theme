// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { join } from 'path';
import fg from 'fast-glob';
import { renderSync, types } from 'sass';
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
  const { css } = renderSync({
    file,
    functions: {
      'regex-test($string, $regex)': ($string, $regex) => {
        const string = $string.toString().replace(/^['"]|['"]$/g, '');
        const regex = stringToRegex($regex.toString().replace(/^['"]|['"]$/g, ''));

        return types.Boolean[regex.test(string).toString().toUpperCase()];
      },
      'regex-replace($string, $regex, $replace)': ($string, $regex, $replace) => {
        const string = $string.toString().replace(/^['"]|['"]$/g, '');
        const regex = stringToRegex($regex.toString().replace(/^['"]|['"]$/g, ''));
        const replace = $replace.toString().replace(/^['"]|['"]$/g, '');

        return new types.String(string.replace(regex, replace));
      },
    },
    importer: [
      // NOTE: sass importers don't "stack", instead sass just uses the first
      //       importer that returns a valid path, that means we can't easily
      //       implement aliases and still use [node-sass-magic-importer](https://www.npmjs.com/package/node-sass-magic-importer)
      (url, prev) => {
        const resolvedUrl = resolveAlias(url);
        const oldUrl = url;
        url = (resolvedUrl ?? url).replace(/\\/g, '/');

        if (fg.isDynamicPattern(url)) {
          const globPath = join(prev, '..', url).replace(/\\/g, '/');
          const glob = fg.globSync([
            url.replace(/\\/g, '/'),
            globPath,
          ]);

          if (glob.length === 0) return null;

          return {
            contents: glob
              .map((path) => `@import '${path}';`)
              .join('\n'),
          };
        }

        if (resolvedUrl === oldUrl) return null;
        return {
          file: url,
        };
      },
    ],
    outputStyle: (process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !args.watch)
      ? 'expanded'
      : 'compressed',
  });

  return css.toString();
};
