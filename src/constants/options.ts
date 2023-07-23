import { ParseArgsConfig } from 'node:util';

export const options: ParseArgsConfig['options'] = {
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
  defaults: {
    type: 'boolean',
  },
};

export const extraOptionData: Record<string, ExtraOptionData> = {
  name: {
    default: 'my-theme',
    prompt: true,
  },
  description: {
    default: 'A discord theme.',
    prompt: true,
  },
  author: {
    default: 'me',
    prompt: true,
  },
  version: {
    default: '1.0.0',
    prompt: false,
  },
  defaults: {
    default: false,
    prompt: false,
  },
};
