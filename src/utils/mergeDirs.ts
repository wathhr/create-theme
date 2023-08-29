import { copy, exists } from 'fs-extra';
import { join, relative } from 'path';
import { lstat, readFile, readdir, writeFile } from 'fs/promises';
import deepMerge from 'ts-deepmerge';

async function mergeJson(...files: string[]): Promise<string> {
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

export async function mergeDirs(mainDir: string, ...dirs: string[]) {
  for (const dir of dirs) {
    await copy(dir, mainDir, {
      overwrite: true,
      errorOnExist: false,
      async filter(file) {
        const mainFilePath = join(mainDir, relative(dir, file));
        return !(
          file.endsWith('.json') &&
          (await lstat(file)).isFile() &&
          await exists(mainFilePath)
        );
      }
    });

    (await readdir(dir, { withFileTypes: true }))
      .forEach(async (file) => {
        const mainFilePath = join(mainDir, file.name);
        if (!(
          file.name.endsWith('.json') &&
          file.isFile() &&
          await exists(mainFilePath)
        )) return;

        const content = await mergeJson(mainFilePath, join(dir, file.name));

        try {
          await writeFile(mainFilePath, content);
        } catch (e) {
          throw new Error(`Failed to write combined JSON "${mainFilePath}":`, e);
        }
      });
  }
}
