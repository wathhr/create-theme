import { copy, ensureDir, exists } from 'fs-extra';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import commandExists from 'command-exists';
import { intro, outro, spinner as spinnerInit } from '@clack/prompts';
import { replaceMeta, register, registeredOpts } from '@utils';
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

const path = join(process.cwd(), registeredOpts.get('name').value.toString());

await ensureDir(path);
await copy(join(root, 'templates/base'), path, {
  overwrite: false,
  errorOnExist: true,
});
await copy(join(root, 'templates', registeredOpts.get('language').value.toString()), path);

spinner.message('Replacing metadata...');
for (const file of metaFiles) {
  const filePath = join(path, file);
  if (!exists(filePath)) continue;
  await replaceMeta(filePath);
}

if (exists(join(path, 'package.json'))) {
  spinner.message('Installing packages...');
  const packageManagers = ['yarn', 'pnpm', 'npm'];
  const opts = { cwd: path };
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
}

spinner.stop();
outro('Done!');
