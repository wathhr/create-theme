// @ts-check
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const context = await esbuild.context({
  entryPoints: ['./src/index.ts'],
  outfile: './dist/bin.js',
  banner: {
    'js': '#!/usr/bin/env node',
  },
  minify: false,
  bundle: true,
  external: [
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.dependencies ?? {}),
  ],
  platform: 'node',
  format: 'esm',
  logLevel: 'info',
});

if (process.argv.includes('--watch')) await context.watch();
else {
  await context.rebuild();
  await context.dispose();
}
