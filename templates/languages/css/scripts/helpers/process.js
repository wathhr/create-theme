// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import browserslist from 'browserslist';
import { browserslistToTargets, bundleAsync } from 'lightningcss';
const require = createRequire(import.meta.url);

/** @type {import('../types').ThemeConfig} */
const config = require('../../theme.config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../..');

/** @type {PreprocessExport} */
export const preprocess = async (file, { args, clientExport }) => {
  const aliasRegex = new RegExp(`^(?<main>${Object.keys(config.paths ?? {}).join('|')})(?<path>.*)`);

  const { code } = await bundleAsync({
    filename: file,
    minify: process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !args.watch,
    projectRoot: root,
    targets: browserslistToTargets(browserslist(clientExport.targets ?? config.targets ?? 'Chrome >= 108')), // Electron v22+
    include: clientExport.features ?? config.features ?? 0,
    drafts: clientExport.drafts ?? config.drafts ?? {},
    analyzeDependencies: true,
    resolver: {
      resolve(specifier, from) {
        const path = join(dirname(from), specifier);
        if (!config.paths) return path;

        const match = specifier.match(aliasRegex);
        const mainGroup = match?.groups?.main;
        if (!match || !mainGroup) return path;
        if (!(mainGroup in (config.paths ?? {}))) return path;
        const pathGroup = match.groups?.path;

        const possiblePaths = config.paths[mainGroup]
          .map((path) => join(root, path, pathGroup ?? ''))
          .filter((path) => existsSync(path) && statSync(path).isFile());

        if (possiblePaths.length === 0) throw `No valid paths for ${specifier}`;

        return possiblePaths[0];
      }
    }
  });

  return code.toString();
};

/** @type {PostprocessExport} */
export const postprocess = (file) => readFileSync(file, 'utf8'); // disabled postprocess export
