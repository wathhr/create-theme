import { createRequire } from 'module';
import deepMerge from 'ts-deepmerge';

const require = createRequire(import.meta.url);

export function combineJson(...files: string[]): string {
  const objects = files.map((file) => require(file));

  try {
    return JSON.stringify(deepMerge(...objects), null, 2);
  } catch (e) {
    throw new Error(`Failed to combine JSON files [${files}]:`, e);
  }
}
