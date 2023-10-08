import { copy, exists } from 'fs-extra';
import { Dirent } from 'fs';
import { join, relative } from 'path';
import { lstat, readFile, readdir, writeFile } from 'fs/promises';
import deepMerge from 'ts-deepmerge';
import { templateData } from '@root/types';
import { addMetaFiles } from '@constants';

const specialExts = [
  'json',
] as const;

export async function mergeDirs(mainDir: string, ...dirs: string[]) {
  // TODO: Skip node_modules
  async function skipCopy(file: string, mainFilePath: string, stat?: Dirent): Promise<boolean> {
    const extension = file.split('.').pop();
    const shouldSkip = (                                         // Skip if:
      file.endsWith('$data.json') ||                             // the name of the file is '$data.json'
      ((specialExts as readonly string[]).includes(extension) && // OR  it has a special extension
      (stat ?? await lstat(file)).isFile() &&                    // AND it's a file
      await exists(mainFilePath))                                // AND it's already in the main folder
    );

    return shouldSkip;
  }

  for (const dir of dirs) {
    await copy(dir, mainDir, {
      overwrite: true,
      errorOnExist: false,
      async filter(file) {
        const mainFilePath = join(mainDir, relative(dir, file));
        const skip = await skipCopy(file, mainFilePath);

        return !skip;
      }
    });

    const files = await readdir(dir, { withFileTypes: true });
    for (const dirent of files) {
      const fileName = dirent.name;
      const mainFilePath = join(mainDir, fileName);
      if (!await skipCopy(fileName, mainFilePath, dirent) || /node_modules/.test(mainFilePath)) continue;
      const fileExt = fileName.split('.').pop() as typeof specialExts[number];

      if (fileName === '$data.json') {
        const data: templateData = JSON.parse(await readFile(join(dir, fileName), 'utf8'));
        addMetaFiles(...(data?.metaFiles ?? []));

        continue;
      }

      try {
        await writeFile(mainFilePath, await (async (): Promise<string> => {
          switch (fileExt) {
            case 'json': return await mergeJson(mainFilePath, join(dir, fileName));

            default: throw new Error(`Unexpected file extension: "${fileName}"`);
          }
        })());
      } catch (e) {
        console.error(`Failed to write file to: "${mainFilePath}"`, e);
      }
    }
  }
}

async function mergeJson(...files: string[]) {
  const objects = await Promise.all(files.map(async (file): Promise<object> => {
    try {
      return await readFile(file, 'utf8').then(JSON.parse);
    } catch (e) {
      throw new Error(`Failed to require "${file}"`, e);
    }
  }));

  try {
    const merged = deepMerge(...objects);
    return JSON.stringify(merged, null, 2);
  } catch (e) {
    throw new Error(`Failed to combine JSON files [${files}]:`, e);
  }
}
