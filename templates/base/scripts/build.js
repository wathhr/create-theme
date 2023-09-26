// @ts-check
/** @typedef {import('./types').ClientExport} ClientExport */
/** @typedef {import('./types').PreprocessExport} PreprocessExport */
/** @typedef {import('./types').PostprocessExport} PostprocessExport */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { tmpdir } from 'node:os';
import asar from '@electron/asar';
import browserslist from 'browserslist';
import parcelWatcher from '@parcel/watcher';
import { browserslistToTargets, transform } from 'lightningcss';
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

const { values: args, positionals } = parseArgs({
  options: {
    input: {
      type: 'string',
      short: 'i',
    },
    output: {
      type: 'string',
      short: 'o',
    },
    client: {
      type: 'string',
      multiple: true,
      short: 'c',
    },
    watch: {
      type: 'boolean',
      short: 'w',
    }
  },
  allowPositionals: true,
});

const defaults = {
  input: positionals.at(-1) ?? join(root, config.inputFile),
  output: join(root, 'dist/'),
  client: args.watch ? [config.preferredClient || 'betterDiscord'] : ['all'],
  watch: false
};
/** @type {Required<typeof defaults>} */
// @ts-expect-error For some reason it thinks the keys can be undefined?
const values = {
  ...defaults,
  ...args,
};

// Ensure the output directory exists
if (!existsSync(values.output)) await mkdir(values.output, {
  recursive: true,
});

const clientExports = await import('./helpers/clients.js');
if (values.client.includes('all')) values.client = Object.keys(clientExports);

if (values.watch) {
  if (values.client.length > 1) throw new Error('Only 1 client is allowed on watch mode.');
  const client = values.client[0];

  await build(client);
  console.log('Watching...');
  const watcher = await parcelWatcher.subscribe(join(root, 'src'), debounce(100, async (err, events) => {
    if (err) throw err;

    for (const event of events) {
      console.log(`[${new Date().toLocaleTimeString()}] Caught event "${event.type}" at "${event.path}"`);
    }
    await build(client);
  }));

  process.on('beforeExit', watcher.unsubscribe);
} else {
  for (const client of values.client) {
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
  const clientExport = clientExports[client](config, require('../package.json'));
  const outputLocation = join(values.output, clientExport.fileName);

  /** @type {{ preprocess?: PreprocessExport, postprocess?: PostprocessExport }} */
  const {
    preprocess = async (file) => await readFile(file, 'utf8'),
    postprocess = (file, content) => transform({
      filename: file,
      code: Buffer.from(content),
      minify: process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : !values.watch,
      projectRoot: root,
      targets: browserslistToTargets(browserslist(clientExport.targets ?? 'Chrome >= 108')), // Electron v22+
      include: clientExport.features ?? config.features ?? 0,
      drafts: clientExport.drafts ?? config.drafts ?? {},
      analyzeDependencies: true,
    }).code.toString(),
  } = await import('./helpers/process.js');

  const extras = {
    args: values,
    clientExport: clientExport,
    config: config,
    root,
  };

  try {
    var preprocessed = await preprocess(values.input, extras);
    var css = await postprocess(values.input, preprocessed, extras);
  } catch (e) {
    console.error('Failed to compile source code:', e?.message);
    process.exit(1);
  }

  try {
    if (clientExport.type === 'file') writeFile(outputLocation, clientExport.compile(css));
    else {
      const tmpDir = join(await realpath(tmpdir()), client);
      mkdir(tmpDir, { recursive: true });
      await clientExport.compile(css, root, tmpDir);
      await asar.createPackage(tmpDir, outputLocation);
      await rm(tmpDir, {
        recursive: true,
        force: true,
      });
    }
  } catch (e) {
    // TODO: Handle errors on the callers (removing the try catch just exists the app on error for some reason)
    console.error((values.watch ? '' : `Failed to compile for client ${client}: `) + e);
  }
}
