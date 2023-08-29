import { ensureDir, exists } from 'fs-extra';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import commandExists from 'command-exists';
import * as clack from '@clack/prompts';
import { replaceMeta, register, registeredOpts, mergeDirs } from '@utils';
import { root, options, metaFiles } from '@constants';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false,
});

export const useDefaults = values.defaults ?? false;

clack.intro('Discord theme creator');
for (const o in options) {
  const opt = o as keyof typeof options;
  await register(opt, values[opt]);
}

const spinner = clack.spinner();
spinner.start();
spinner.message('Copying project files...');

const themePath = resolve(process.cwd(), registeredOpts.get('path').value.toString());
const baseTemplate = join(root, 'templates/base');
const languageTemplate = join(root, 'templates', registeredOpts.get('language').value.toString());

await ensureDir(themePath);
if ((await readdir(themePath)).length > 0) {
  const force = await clack.confirm({
    message: 'The selected directory is not empty, do you want to continue?',
    initialValue: false,
  });

  if (force !== true) process.exit(1);
}

// Combine JSON files from both directories
await mergeDirs(themePath, baseTemplate, languageTemplate);

spinner.message('Replacing metadata...');
for (const file of metaFiles) {
  const filePath = join(themePath, file);
  if (!exists(filePath)) continue;
  await replaceMeta(filePath);
}

spinner.message('Installing packages...');
const packageManagers = ['yarn', 'pnpm', 'npm'];
const opts = { cwd: themePath };
if (process.env.npm_execpath) {
  spawnSync(process.env.npm_execpath, ['install'], opts);
  packageManagers.length = 0;
}
for (const pm of packageManagers) {
  if (commandExists.sync(pm)) {
    spawnSync(pm, ['install'], opts);
    break;
  }
}

spinner.stop();
clack.outro('Done!');
