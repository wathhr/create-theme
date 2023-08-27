import { readFile } from 'fs/promises';

export const compile = async (file) => await readFile(file, 'utf8');
