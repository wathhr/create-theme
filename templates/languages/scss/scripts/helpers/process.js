// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { compileAsync } from 'sass';

/** @type {PreprocessExport} */
export const preprocess = async (file) => {
  return (await compileAsync(file)).css;
};
