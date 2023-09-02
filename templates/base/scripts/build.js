// @ts-check
/** @typedef {import('./types').ClientExport} ClientExport */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import arg from 'arg'; // Get rid of this and use parseArgs from node:utils
import asar from '@electron/asar';
import parcelWatcher from '@parcel/watcher';
import { debounce } from 'throttle-debounce';

const require = createRequire(import.meta.url);
/** @type {Required<import('./types').ThemeConfig>} */
const config = require('../theme.config.json');
const configKeys = [
  'name',
  'author',
  'description',
  'version',
  'inputFile',
];
for (const key of configKeys) {
  if (key in config) continue;
  throw new Error(`"${key}" is missing from your "theme.config.json"`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const args = Object.fromEntries(Object.entries(arg({
  '--input': String,
  '--output': String,
  '--clients': [String], '--client': '--clients', '-c': '--clients',
  '--watch': Boolean,
})).map(([key, value]) => [key.replace(/^-{1,2}/, ''), value]));

const defaults = {
  input: args._.at(-1) ?? join(root, config.inputFile),
  output: join(root, 'dist/'),
  clients: args.watch ? ['betterDiscord'] : ['all'],
  watch: false
};
const values = {
  ...defaults,
  ...args,
};

// Ensure the output directory exists
if (!existsSync(values.output)) await mkdir(values.output, {
  recursive: true,
});

const clientExports = await import('./clients.js') ?? {};
if (values.clients.includes('all')) values.clients = Object.keys(clientExports);

const { compile } = await import('./compile.js');

if (values.watch) {
  if (values.clients.length > 1) throw new Error('Only 1 client is allowed on watch mode.');
  const client = values.clients[0];

  await build(client);
  const watcher = await parcelWatcher.subscribe(join(root, 'src'), debounce(100, async (err, events) => {
    if (err) throw err;

    for (const event of events) {
      console.log(`[${new Date().toLocaleTimeString()}] Caught event "${event.type}" at "${event.path}"`);
    }
    await build(client);
  }));

  process.on('beforeExit', watcher.unsubscribe);
} else {
  for (const client of values.clients) {
    await build(client);
  }
}

/**
 * Runs the build process for the specified client
 * @param {string} client The export name of the client
*/
async function build(client) {
  if (!(client in clientExports)) throw new Error(`No export for client "${client}"`);
  /** @type {ReturnType<ClientExport>} */
  const clientExport = clientExports[client](config);
  const outputLocation = join(values.output, clientExport.fileName);

  try {
    const css = await compile(values.input);
    if (clientExport.type === 'file') writeFile(outputLocation, clientExport.compile(css));
    else {
      const tmpDir = join(await realpath(tmpdir()), client);
      mkdir(tmpDir, { recursive: true });
      await clientExport.compile(css, root, tmpDir);
      await asar.createPackage(tmpDir, outputLocation);
      await rm(tmpDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
      });
    }
  } catch (e) {
    // TODO: Handle errors on the callers (removing the try catch just exists the app on error for some reason)
    console.error((values.watch ? '' : `Failed to compile for client ${client}: `) + e);
  }
}
