#!/bin/false

// @ts-check
/** @typedef {import('../types').PreprocessExport} PreprocessExport */
/** @typedef {import('../types').PostprocessExport} PostprocessExport */

import { readFile } from 'fs/promises';

/** @type {PreprocessExport} */
export const preprocess = async (file) => await readFile(file, 'utf8');
