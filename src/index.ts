import { copy, ensureDir, exists } from 'fs-extra';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import commandExists from 'command-exists';
import { intro, outro, spinner as spinnerInit } from '@clack/prompts';
import { replaceMeta, register, registeredOpts, combineJson } from '@utils';
import { root, options, metaFiles } from '@constants';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false,
});

export const useDefaults = values.defaults ?? false;

intro('Discord theme creator');
for (const o in options) {
  const opt = o as keyof typeof options;
  await register(opt, values[opt]);
}

const spinner = spinnerInit();
spinner.start();
spinner.message('Copying project files...');

const themePath = join(process.cwd(), registeredOpts.get('name').value.toString());
const languageTemplate = join(root, 'templates', registeredOpts.get('language').value.toString());
const baseTemplate = join(root, 'templates/base');

await ensureDir(themePath);
await copy(baseTemplate, themePath, {
  overwrite: false,
  errorOnExist: true,
});
await copy(languageTemplate, themePath);

// Combine JSON files from both directories
(await readdir(languageTemplate, { withFileTypes: true }))
  .forEach(async (file) => {
    if (!(
      file.name.endsWith('.json') &&
      file.isFile() &&
      exists(join(languageTemplate, file.name))
    )) return;

    await writeFile(
      join(themePath, file.name),
      combineJson(join(baseTemplate, file.name), join(languageTemplate, file.name)),
    );
  });

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
outro('Done!');
