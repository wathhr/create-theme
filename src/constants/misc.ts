import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const root = join(__dirname, '..');

export const configKeys = [
  'name',
  'author',
  'description',
  'version',
  'inputFile',
];

export const metaFiles = [
  'index.json',
  'theme.config.json',
];

export const addMetaFiles = (...files: string[]) => metaFiles.push(...files);
