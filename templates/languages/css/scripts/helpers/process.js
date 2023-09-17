// @ts-check
/** @typedef {import('./types').PreprocessExport} PreprocessExport */
/** @typedef {import('./types').PostprocessExport} PostprocessExport */

import browserslist from 'browserslist';
import { browserslistToTargets, bundle } from 'lightningcss';

/** @type {PostprocessExport} */
export const preprocess = (file, { args, clientExport, config, root }) => bundle({
  filename: file,
  minify: process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !args.watch,
  projectRoot: root,
  targets: browserslistToTargets(browserslist(clientExport.targets ?? 'Chrome >= 108')), // Electron v22+
  include: clientExport.features ?? config.features ?? 0,
  drafts: clientExport.drafts ?? config.drafts ?? {},
  analyzeDependencies: true,
}).code.toString();

/** @type {PreprocessExport} */
export const postprocess = (_, content) => content;
