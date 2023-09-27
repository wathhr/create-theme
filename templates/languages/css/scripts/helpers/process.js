// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { dirname, join } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import browserslist from 'browserslist';
import { browserslistToTargets, bundleAsync } from 'lightningcss';

/** @type {PreprocessExport} */
export const preprocess = async (file, { args, clientExport, config, root }) => {
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

        if (possiblePaths.length === 0) throw new Error(`No valid paths for ${specifier}`);

        return possiblePaths[0];
      }
    }
  });

  return code.toString();
};

/** @type {PostprocessExport} */
export const postprocess = (file) => readFileSync(file, 'utf8'); // disabled postprocess export
