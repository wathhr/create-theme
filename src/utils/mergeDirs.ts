import { copy, exists } from 'fs-extra';
import { Dirent } from 'fs';
import { join, relative } from 'path';
import { lstat, readFile, readdir, writeFile } from 'fs/promises';
import deepMerge from 'ts-deepmerge';

const specialExts = [
  'json',
] as const;

export async function mergeDirs(mainDir: string, ...dirs: string[]) {

  async function skipCopy(file: string, mainFilePath: string, stat?: Dirent): Promise<boolean> {
    const extension = file.split('.').pop();
    const shouldSkip = (                                        // Skip if:
      (specialExts as readonly string[]).includes(extension) && // it has a special extension
      (stat ?? await lstat(file)).isFile() &&                   // and it's a file
      await exists(mainFilePath)                                // and it's already in the main folder
    );

    return shouldSkip;
  }

  for (const dir of dirs) {
    await copy(dir, mainDir, {
      overwrite: true,
      errorOnExist: false,
      async filter(file) {
        const mainFilePath = join(mainDir, relative(dir, file));
        return !await skipCopy(file, mainFilePath);
      }
    });

    const files = await readdir(dir, { withFileTypes: true });
    for (const dirent of files) {
      const fileName = dirent.name;
      const mainFilePath = join(mainDir, fileName);
      if (!await skipCopy(fileName, mainFilePath, dirent)) continue;
      const fileExt = fileName.split('.').pop() as typeof specialExts[number];

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
  const objects = [];
  for (const file of files) {
    objects.push(JSON.parse(await readFile(file, 'utf8')));
  }

  try {
    const merged = deepMerge(...objects);
    return JSON.stringify(merged, null, 2);
  } catch (e) {
    throw new Error(`Failed to combine JSON files [${files}]:`, e);
  }
}
