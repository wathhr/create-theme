// @ts-check
/** @typedef {import('./types').ClientExport} ClientExport */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { realpath, rm, writeFile } from 'node:fs/promises';
import arg from 'arg';
import asar from '@electron/asar';

const require = createRequire(import.meta.url);
const config = require('../theme.config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const args = arg({
  '--input': String,
  '--output': String,
  '--clients': [String], '--client': '--clients', '-c': '--clients',
  '--watch': Boolean,
});

const defaults = {
  input: args._.at(-1) ?? join(__dirname, '../src/index.scss'),
  output: join(__dirname, '../dist/'),
  clients: ['all'],
  watch: false
};
const values = {
  ...defaults,
  ...Object.fromEntries(Object.entries(args).map(([key, value]) => [key.replace(/^-{1,2}/, ''), value])),
};

const clientExports = await import('./clients.js') ?? {};
if (values.clients.includes('all')) values.clients = Object.keys(clientExports);

const { default: compile } = await import('./compile.js');
const css = await compile(values.input);
for (const client of values.clients.map(c => c.toLowerCase())) {
  if (!clientExports[client]) throw new Error(`No export for client ${client}`);
  /** @type {ReturnType<ClientExport>} */
  const clientExport = clientExports[client](config);

  const outputLocation = join(values.output, clientExport.fileName);

  try {
    if (clientExport.type === 'file') writeFile(outputLocation, clientExport.compile(css));
    else {
      const tmpDir = await realpath(tmpdir());
      await clientExport.compile(css, root, tmpDir);
      asar.createPackage(tmpDir, outputLocation);
      await rm(tmpDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
      });
    }
  } catch (e) {
    console.error(`Failed to compile for client ${client}`, e);
  }
}
