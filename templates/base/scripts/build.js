#!/usr/bin/env node
// @ts-check
/** @typedef {import('./types').ClientExport} ClientExport */
/** @typedef {import('./types').PostprocessExport} PostprocessExport */
/** @typedef {import('./types').PreprocessExport} PreprocessExport */
/** @typedef {import('@schemastore/package').JSONSchemaForNPMPackageJsonFiles} JSONSchemaForNPMPackageJsonFiles */

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { createWriteStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { mkdir, readFile, realpath, rm, writeFile } from 'fs/promises';
import { parseArgs } from 'util';
import { tmpdir } from 'os';
import archiver from 'archiver';
import asar from '@electron/asar';
import browserslist from 'browserslist';
import parcelWatcher from '@parcel/watcher';
import { browserslistToTargets, transform } from 'lightningcss';
import { debounce } from 'throttle-debounce';
import log from './utils/logger.js';

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
  log.error(`"${key}" is missing from your "theme.config.json"`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    input: {
      type: 'string',
      short: 'i',
    },
    splashInput: {
      type: 'string',
      short: 's',
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
});

const defaults = {
  input: positionals.at(-1) ?? join(root, config.inputFile),
  splashInput: config.splashInputFile ? join(root, config.splashInputFile) : undefined,
  output: join(root, 'dist/'),
  client: args.watch ? ['default'] : ['all'],
  watch: false
};
/** @type {Required<typeof defaults>} */
const values = {
  ...defaults,
  ...Object.fromEntries(Object.entries(args).filter(([_, value]) => value !== undefined)),
};

// Ensure the output directory exists
if (!existsSync(values.output)) await mkdir(values.output, { recursive: true });

const clientExports = await import('./helpers/clients.js');
if (values.client.includes('all')) values.client = Object.keys(clientExports);

if (values.watch) {
  if (values.client.length > 1) throw new Error('Only 1 client is allowed on watch mode.');
  const client = values.client[0];

  log.info('Watching...');
  await build(client);
  const watcher = await parcelWatcher.subscribe(join(root, 'src'), debounce(100, async (err, events) => {
    if (err) throw err;

    for (const event of events) {
      log.info(`[${new Date().toLocaleTimeString()}] Caught event "${event.type}" at "${event.path}"`);
    }
    await build(client).catch(log.error);
  }));

  process.on('beforeExit', watcher.unsubscribe);
} else {
  for (const client of values.client) {
    await build(client).catch(log.error);
  }
}

/**
 * Runs the build process for the specified client
 * @param {string} client The export name of the client
 */
async function build(client) {
  if (!(client in clientExports)) throw new Error(`No export for client "${client}"`);
  /** @type {ClientExport} */
  const clientExport = clientExports[client];
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
    clientExport,
  };

  const css = await (async () => {
    try {
      const preprocessed = await preprocess(values.input, extras);
      return await postprocess(values.input, preprocessed, extras);
    } catch (e) {
      log.error('Failed to compile source code.', e);
      process.exit(1);
    }
  })();

  const splashCss = await (async () => {
    if (!values.splashInput) return undefined;

    try {
      const preprocessed = await preprocess(values.splashInput, extras);
      return await postprocess(values.splashInput, preprocessed, extras);
    } catch (e) {
      log.error('Failed to compile splash source code.', e);
      process.exit(1);
    }
  })();

  try {
    switch (clientExport.type) {
      case 'file': {
        writeFile(outputLocation, clientExport.compile(css));
      } break;

      case 'asar': {
        const tmpDir = join(await realpath(tmpdir()), client);
        mkdir(tmpDir, { recursive: true });
        await clientExport.compile({
          content: css,
          splashContent: splashCss,
          tmpDir,
        });

        await asar.createPackage(tmpDir, outputLocation);
        await rm(tmpDir, { recursive: true, force: true });
      } break;

      case 'zip': {
        const tmpDir = join(await realpath(tmpdir()), client);
        mkdir(tmpDir, { recursive: true });
        await clientExport.compile({
          content: css,
          splashContent: splashCss,
          tmpDir,
        });

        await new Promise((resolve, reject) => {
          const archive = archiver('zip');
          const output = createWriteStream(outputLocation);
          output.on('close', () => resolve(true));
          archive.on('error', reject);

          archive.pipe(output);
          archive.directory(tmpDir, false);
          archive.finalize();
        });

        await rm(tmpDir, { recursive: true, force: true });
      } break;
    }
  } catch (e) {
    throw new Error(`Failed to compile for client ${clientExport.name}: ${e}`);
  }

  try {
    await clientExport.postRun?.();
  } catch (e) {
    log.warn(`Failed to run postrun script for client ${clientExport.name}: ${e}`);
  }

  log.success(`Built ${clientExport.name} successfully.`);
}
