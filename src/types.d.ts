import * as clack from '@clack/prompts';
export { ThemeConfig } from '../templates/base/scripts/types';

export type ArgumentValue = OptionalReadonly<string | boolean | (string | boolean)[]>;

export type RegisteredOpt = {
  prompted: boolean,
  value: ArgumentValue,
};

type OptionalReadonly<T> = Readonly<T> | T;

export type ExtraOptionData = {
  default: OptionalReadonly<ArgumentValue>;
} & ({ prompt: true; message: string } | { prompt: false }) & ({
  type: 'boolean',
} | {
  type: 'multiselect',
  options: OptionalReadonly<Parameters<typeof clack.multiselect>['0']['options']>,
} | {
  type: 'select',
  options: OptionalReadonly<Parameters<typeof clack.select>['0']['options']>,
} | {
  type?: 'text',
});
