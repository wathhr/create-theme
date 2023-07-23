import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const root = join(__dirname, '..');

export const metaFiles = [
  'manifest.json',
  'theme.config.json',
];

export const requiredConfigKeys = [
  'name',
  'author',
  'description',
  'version',
];
