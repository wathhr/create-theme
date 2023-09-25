import * as clack from '@clack/prompts';
import { extraOptionData, options } from '@constants';
export { ThemeConfig } from '../templates/base/scripts/types';

type OptionsType = typeof options;
type ExtraOptionDataType = typeof extraOptionData;
export type ArgumentValue = string | boolean | (string | boolean)[];

export type ExtraOptionData<T extends keyof OptionsType> = {
  // TODO: Make this less hacky (remove GetPropDefault)
  default: GetPropDefault<OptionsType[T], 'multiple', false> extends true
    ? Array<StringToType<OptionsType[T]['type']>>
    : StringToType<OptionsType[T]['type']>;
} & ({ prompt: true; message: string } | { prompt: false }) & ({
  type: 'boolean',
} | {
  type: 'multiselect',
  options: Parameters<typeof clack.multiselect>['0']['options'],
} | {
  type: 'select',
  options: Parameters<typeof clack.select>['0']['options'],
} | {
  type?: 'text',
});

export type ExtraOptionDataObject = {
  [K in keyof OptionsType]: ExtraOptionData<K>;
};

export type RegisteredOptions = {
  [K in keyof ExtraOptionDataType]: {
    prompted: boolean,
    value: ExtraOptionDataType[K]['default'],
  };
};

type GetPropDefault<
  T extends object,
  U extends string,
  V extends boolean = false
> = U extends keyof T ? T[U] : V;

type ArgumentTypeMap = {
  string: string;
  boolean: boolean;
  number: number;
};
type StringToType<T extends keyof ArgumentTypeMap> =
  T extends keyof ArgumentTypeMap ? ArgumentTypeMap[T] :
  never;
