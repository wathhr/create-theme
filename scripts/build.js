// @ts-check

import * as esbuild from 'esbuild';

const context = await esbuild.context({
  entryPoints: ['./src/index.ts'],
  outfile: './dist/bin.js',
  banner: {
    'js': '#!/usr/bin/env node',
  },
  minify: false,
  bundle: true,
  external: ['./node_modules/*'],
  platform: 'node',
  format: 'esm',
  logLevel: 'info',
});

if (process.argv.includes('--watch')) await context.watch();
else {
  await context.rebuild();
  await context.dispose();
}
