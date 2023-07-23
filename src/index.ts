import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { copy } from 'fs-extra';
import { register, registeredOpts } from 'manageOpts';
import { root, options, extraOptionData, metaFiles } from '@constants';
import { replaceMeta } from '@utils/replaceMeta';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false,
});

export const useDefaults = values.defaults ?? false;

for (const opt in options) {
  await register(opt, values[opt], extraOptionData[opt].prompt);
}

const path = join(process.cwd(), registeredOpts.get('name').value.toString());

await copy(join(root, 'template'), path, {
  overwrite: false,
  errorOnExist: true,
});

for (const file of metaFiles) {
  const filePath = join(path, file);
  await replaceMeta(filePath);
}
