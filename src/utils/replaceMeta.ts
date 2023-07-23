import { readFile, writeFile } from 'node:fs/promises';
import { requiredConfigKeys, extraOptionData } from '@constants';
import { registeredOpts } from 'manageOpts';

// TODO: Add support for arrays somehow?
export async function replaceMeta(file: string) {
  const content = await readFile(file, 'utf8');

  const regex = new RegExp(`__theme(${
    requiredConfigKeys
      .map(key => key[0].toUpperCase() + key.slice(1))
      .join('|')})__`, 'g');

  const newContent = content.replace(regex, (_, group: string) => {
    return ((registeredOpts.get(group.toLowerCase())?.value
      ?? extraOptionData[group].default)).toString();
  });

  await writeFile(file, newContent);
}
