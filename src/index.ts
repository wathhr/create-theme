import { ensureDir, exists } from 'fs-extra';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import commandExists from 'command-exists';
import spawn from 'cross-spawn';
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

const themePath = resolve(process.cwd(), registeredOpts.path.value);
const baseTemplate = join(root, 'templates/base');
const languageTemplate = join(root, 'templates/languages', registeredOpts.language.value);
const extrasTemplates = registeredOpts.extras.value.map((e) => join(root, 'templates/extras', e));

const spinner = clack.spinner();
spinner.start('Copying project files...');

await ensureDir(themePath);
if ((await readdir(themePath)).length > 0) {
  const force = await clack.confirm({
    message: 'The selected directory is not empty, do you want to continue?',
    initialValue: false,
  });

  if (force !== true) process.exit(1);
}

await mergeDirs(themePath, baseTemplate, languageTemplate, ...extrasTemplates);

spinner.message('Replacing metadata...');
if (registeredOpts.language.value === 'scss') metaFiles.push('src/common/vars.scss');
for (const file of metaFiles) {
  const filePath = join(themePath, file);
  if (!exists(filePath)) continue;
  await replaceMeta(filePath);
}

spinner.message('Installing packages...');
const packageManagers = ['yarn', 'pnpm', 'npm'];
const opts = { cwd: themePath };
if (process.env.npm_execpath) {
  spawn.sync(process.env.npm_execpath, ['install'], opts);
  packageManagers.length = 0;
}
for (const pm of packageManagers) {
  if (commandExists.sync(pm)) {
    spawn.sync(pm, ['install'], opts);
    break;
  }
}

spinner.stop();
clack.outro('Done!');
