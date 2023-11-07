#!/bin/false
// @ts-check
/** @typedef {import('sass').LegacyValue} LegacyValue */
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { join } from 'path';
import fg from 'fast-glob';
import { renderSync, types } from 'sass';
import resolveAlias from '../utils/resolveAlias.js';

/** @param {string} string */
function stringToRegex(string) {
  const flagRegex = /(?<=\/)[gmiyusd]*$/;
  const expression = string.replace(flagRegex, '').replace(/^\/|\/$/g, '');
  const flags = string.match(flagRegex)?.[0];
  return new RegExp(expression, flags);
}

/** @param {LegacyValue} value */
function getData(value) {
  if ('getA' in value) return {
    type: types.Color,
    name: 'SassColor',
    value: `rgb(${value.getA() * 255}, ${value.getR() * 255}, ${value.getG() * 255}, ${value.getB() * 255})`,
  };
  if ('getSeperator' in value) return {
    type: types.List,
    name: 'SassList',
    value: (() => {
      /** @type {types.List} */
      // @ts-expect-error bad ts checking
      const sassList = value;

      /** @type {LegacyValue[]} */
      const list = [];
      for (let i = 0; i < sassList.getLength(); i++) {
        const item = sassList.getValue(i);
        if (item) list.push(item);
      }

      return list;
    })(),
  };
  if ('getKey' in value) return {
    type: types.Map,
    name: 'SassMap',
    value: (() => {
      /** @type {Record<string, LegacyValue>} */
      const map = {};
      for (let i = 0; i < value.getLength(); i++) {
        const itemKeyData = getData(value.getKey(i));
        if (itemKeyData.type !== types.String) continue;
        /** @type {string} */
        // @ts-expect-error bad ts checking
        const itemKey = itemKeyData.value;
        const itemValue = value.getValue(i);
        map[itemKey] = itemValue;
      }

      return map;
    })(),
  };
  if ('getUnit' in value) return {
    type: types.Number,
    name: 'SassNumber',
    value: {
      number: value.getValue(),
      unit: value.getUnit(),
    },
  };
  if ('setValue' in value) return {
    type: types.String,
    name: 'SassString',
    // @ts-expect-error bad ts checking
    value: value.getValue(),
  };
  if ('getValue' in value) return {
    type: types.Boolean,
    name: 'SassBoolean',
    value: value.getValue(),
  };

  // This could also be `types.Error` but I don't see how that would work
  return {
    type: types.Null,
    name: 'SassNull',
    value: null,
  };
}

/** @type {PreprocessExport} */
export const preprocess = (file, { args, clientId }) => {
  const { css } = renderSync({
    file,
    functions: {
      'client': () => new types.String(clientId),
      'regex-test($string, $regex)': ($string, $regex) => {
        const args = [$string, $regex].map((arg) => {
          const argData = getData(arg);
          if (typeof argData.value === 'string') return argData.value.replace(/^['"]|['"]$/g, '');
          throw new Error(`Expected string, got ${argData.name}`);
        });

        const string = args[0];
        const regex = stringToRegex(args[1]);

        return types.Boolean[regex.test(string).toString().toUpperCase()];
      },
      'regex-replace($string, $regex, $replace)': ($string, $regex, $replace) => {
        const args = [$string, $regex, $replace].map((arg) => {
          const argData = getData(arg);
          if (typeof argData.value === 'string') return argData.value.replace(/^['"]|['"]$/g, '');
          throw new Error(`Expected string, got ${argData.name}`);
        });
        const string = args[0];
        const regex = stringToRegex(args[1]);
        const replace = args[2];

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
