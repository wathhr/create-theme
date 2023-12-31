import { join } from 'node:path';
import { ParseArgsConfig } from 'node:util';
import { readdir } from 'node:fs/promises';
import type { ExtraOptionDataObject } from '@root/types.d.ts';
import { root } from './misc';

export const options = {
  defaults: {
    type: 'boolean',
  },

  path: {
    type: 'string',
    short: 'p',
  },
  name: {
    type: 'string',
    short: 'n',
  },
  description: {
    type: 'string',
  },
  author: {
    type: 'string',
    short: 'a',
    multiple: true,
  },
  version: {
    type: 'string',
  },

  language: {
    type: 'string',
    short: 'l',
  },
  extras: {
    type: 'string',
    multiple: true,
  }
} as const satisfies ParseArgsConfig['options'];

export const extraOptionData = {
  defaults: {
    prompt: false,
    default: false,
  },

  path: {
    prompt: true,
    message: 'What should the theme path be?',
    default: '.',
  },
  name: {
    prompt: true,
    message: 'What should the name of your theme be?',
    default: 'my-theme',
  },
  description: {
    prompt: true,
    message: 'What should the description be?',
    default: 'A discord theme.',
  },
  author: {
    prompt: true,
    message: 'Who is the author?',
    default: ['Author'],
  },
  version: {
    prompt: false,
    default: '0.0.1',
  },

  language: {
    prompt: true,
    message: 'What language do you want to use?',
    type: 'select',
    options: (await readdir(join(root, 'templates/languages'), { withFileTypes: true }))
      .map(({ name }) => {
        return {
          value: name,
          label: name
            .split(/[\s_-]/)
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(' '),
        };
      }),
    default: 'css',
  },
  extras: {
    prompt: true,
    message: 'Select additional options (use arrow keys/space bar)',
    type: 'multiselect',
    options: (await readdir(join(root, 'templates/extras'), { withFileTypes: true }))
      .map(({ name }) => {
        return {
          value: name,
          label: name
            .split(/[\s_-]/)
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(' '),
        };
      }),
    default: [] as string[],
  }
} satisfies ExtraOptionDataObject;
