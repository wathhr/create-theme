import { join } from 'node:path';
import { ParseArgsConfig } from 'node:util';
import { readdir } from 'node:fs/promises';
import { root } from './misc';

export const options = {
  defaults: {
    type: 'boolean',
  },

  directory: {
    type: 'string',
    short: 'd',
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

  directory: {
    prompt: true,
    message: 'Where should we create your project?',
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
    default: 'Author',
  },
  version: {
    prompt: false,
    default: '0.0.1',
  },

  language: {
    prompt: true,
    message: 'What language do you want to use?',
    type: 'select',
    options: (await readdir(join(root, 'templates'), { withFileTypes: true }))
      .filter((dir) => dir.isDirectory() && dir.name !== 'base')
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
    options: [
      { value: 'ghAction', label: 'GitHub build & release action' }
    ],
    default: [],
  }
} satisfies Record<keyof typeof options, ExtraOptionData>;
