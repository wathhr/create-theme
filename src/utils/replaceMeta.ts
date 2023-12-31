import { readFile, writeFile } from 'node:fs/promises';
import { configKeys, extraOptionData } from '@constants';
import { registeredOpts } from '@utils/manageOpts';

// TODO: Add support for arrays somehow?
export async function replaceMeta(file: string) {
  const content = await readFile(file, 'utf8').catch((e) => {
    throw new Error(`Failed to read "${file}":`, e);
  });

  const regex = new RegExp(`__theme(${
    configKeys
      .map(key => key[0].toUpperCase() + key.slice(1))
      .join('|')})__`, 'g');

  const newContent = content.replace(regex, (_, group: string) => {
    return ((registeredOpts[group.toLowerCase()].value
      ?? extraOptionData[group].default));
  });

  await writeFile(file, newContent).catch((e) => {
    throw new Error(`Failed to write file "${file}":`, e);
  });
}
