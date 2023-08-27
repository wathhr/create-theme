import { compileAsync } from 'sass';

export async function compile(file) {
  return (await compileAsync(file)).css;
}
