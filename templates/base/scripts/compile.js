import { readFile } from 'fs/promises';

export default async(file) => await readFile(file, 'utf8');
