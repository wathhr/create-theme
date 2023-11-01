// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { lstatSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import browserslist from 'browserslist';
import { browserslistToTargets, bundleAsync } from 'lightningcss';
import resolveAlias from '../utils/resolveAlias.js';
const require = createRequire(import.meta.url);

/** @type {import('../types').ThemeConfig} */
const config = require('../../theme.config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../..');

/** @type {PreprocessExport} */
export const preprocess = async (file, { args, clientExport }) => {
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
        let path = join(dirname(from), specifier);

        const resolvedPath = resolveAlias(path);
        const oldPath = path;
        path = (resolvedPath ?? path);

        try {
          if (lstatSync(path).isDirectory()) {
            const indexFiles = ['index.css', 'main.css'];
            for (const file of indexFiles) {
              const filePath = join(path, file);
              if (existsSync(filePath)) return filePath;
            }
          }
        } catch {/* Omitted */}

        if (resolvedPath === oldPath) return oldPath;
        return path;
      }
    }
  });

  return code.toString();
};

/** @type {PostprocessExport} */
export const postprocess = (_, css) => css; // disables postprocess export
