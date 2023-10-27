#!/usr/bin/env node
// @ts-check
/** @typedef {import('./types').Args} Args */
/** @typedef {import('./types').ClientExport} ClientExport */
/** @typedef {import('./types').PostprocessExport} PostprocessExport */
/** @typedef {import('./types').PreprocessExport} PreprocessExport */

import { createRequire } from 'module';
import { createWriteStream, existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { copyFile, mkdir, readFile, realpath, rm, writeFile } from 'fs/promises';
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
/** @type {import('./types').ThemeConfig} */
const baseConfig = require('../theme.config.json');
const requiredConfigKeys = [
  'name',
  'author',
  'description',
  'version',
  'inputFile',
];
for (const key of requiredConfigKeys) {
  if (key in baseConfig) continue;
  log.error(`"${key}" is missing from your "theme.config.json"`);
  process.exit(1);
}

const config = {
  autoInstall: ['betterDiscord', 'replugged'],
  ...baseConfig,
  // this is placed after `...baseConfig` so the keys don't get overwritten if just `clientDist` is specified
  clientDist: {
    betterDiscord: join((() => {
      switch (process.platform) {
        case 'win32': return join(process.env.APPDATA ?? '');
        case 'darwin': return join(process.env.HOME ?? '', 'Library', 'Application Support');
        default: {
          if (process.env.XDG_CONFIG_HOME) return process.env.XDG_CONFIG_HOME;
          return join(process.env.HOME ?? '', '.config');
        }
      }
    })(), 'BetterDiscord', 'themes'),
    replugged: join((() => {
      switch (process.platform) {
        case 'win32': return join(process.env.APPDATA ?? '');
        case 'darwin': return join(process.env.HOME ?? '', 'Library', 'Application Support');
        default: {
          if (process.env.XDG_CONFIG_HOME) return process.env.XDG_CONFIG_HOME;
          return join(process.env.HOME ?? '', '.config');
        }
      }
    })(), 'replugged', 'themes'),
    ...baseConfig.clientDist,
  },
};

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

/** @type {Args} */
const values = {
  input: positionals.at(-1) ?? join(root, config.inputFile),
  splashInput: config.splashInputFile ? join(root, config.splashInputFile) : undefined,
  output: join(root, 'dist/'),
  client: args.watch ? ['default'] : ['all'],
  watch: false,
  ...Object.fromEntries(Object.entries(args).filter(([_, value]) => value !== undefined)),
};

// Ensure the output directory exists
if (!existsSync(values.output)) await mkdir(values.output, { recursive: true });

/** @type {Record<string, ClientExport>} */
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
  const clientExport = clientExports[client];

  /**
   * Places the specified file into the client's output directory (based on `theme.config.json`'s `clientDist`)
   * @param {string} client The export name of the client
   * @param {string} file The theme file
   */
  async function install(client, file) {
    if (!(client in (config.clientDist ?? {}))) {
      log.warn(`Skipping installation for client ${clientExport.name} because no directory is specified.`);
      return;
    }

    const directory = config.clientDist[client];
    if (!(existsSync(directory))) {
      log.warn(`Skipping installation for client ${clientExport.name} because the theme folder does not exist.`);
      return;
    }

    await copyFile(file, join(directory, basename(file)));
  }

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
      log.error('Failed to compile source code.', e.message);
      process.exit(1);
    }
  })();

  const splashCss = await (async () => {
    if (!values.splashInput) return undefined;

    try {
      const preprocessed = await preprocess(values.splashInput, extras);
      return await postprocess(values.splashInput, preprocessed, extras);
    } catch (e) {
      log.error('Failed to compile splash source code.', e.message);
      process.exit(1);
    }
  })();

  let tmpDir = ''; // used by `asar` and `zip` output types
  const outputLocation = join(values.output, clientExport.fileName);
  try {
    switch (clientExport.type) {
      case 'file': {
        writeFile(outputLocation, clientExport.compile(css));
      } break;

      case 'asar': {
        tmpDir = join(await realpath(tmpdir()), client);
        await mkdir(tmpDir, { recursive: true });
        await clientExport.compile({
          content: css,
          splashContent: splashCss,
          tmpDir,
        });

        await asar.createPackage(tmpDir, outputLocation);
      } break;

      case 'zip': {
        tmpDir = join(await realpath(tmpdir()), client);
        await mkdir(tmpDir, { recursive: true });
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
      } break;
    }
  } catch (e) {
    throw new Error(`Failed to compile for client ${clientExport.name}: ${e.message}`);
  }

  if (
    config.autoInstall === true ||
    (typeof config.autoInstall === 'string' && config.autoInstall === client) ||
    (Array.isArray(config.autoInstall) && config.autoInstall.includes(client))
  ) await install(client, outputLocation).catch((e) => {
    throw new Error(`Failed to install for client ${clientExport.name}: ${e.message}`);
  });

  try {
    await clientExport.postRun?.();
  } catch (e) {
    log.warn(`Failed to run postrun script for client ${clientExport.name}: ${e.message}`);
  }

  log.success(`Built ${clientExport.name} successfully.`);

  // cleanup
  if (tmpDir) rm(tmpDir, { recursive: true, force: true });
}
