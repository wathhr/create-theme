#!/bin/false
// @ts-check

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

/** @type {import('../types').ThemeConfig} */
const config = require('../../theme.config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../..');

const aliasRegex = new RegExp(`^(?<main>${Object.keys(config.paths ?? {}).join('|')})(?<path>.*)`);

/** @param {string} url */
export function resolveAlias(url) {
  if (!config.paths) return null;

  const match = url.match(aliasRegex);
  const mainGroup = match?.groups?.main;
  if (!match || !mainGroup) return null;
  if (!(mainGroup in (config.paths ?? {}))) return null;
  const pathGroup = match.groups?.path ?? '';

  const possiblePaths = config.paths[mainGroup]
    .map((path) => join(root, path, pathGroup));

  if (possiblePaths.length === 0) return null;

  return possiblePaths[0];
}

export default resolveAlias;
