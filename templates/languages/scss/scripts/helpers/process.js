// @ts-check
/** @typedef {import('./types').PreprocessExport} PreprocessExport */
/** @typedef {import('./types').PostprocessExport} PostprocessExport */

import { compileAsync } from 'sass';

/** @type {PreprocessExport} */
export async function preprocess(file) {
  return (await compileAsync(file)).css;
}
