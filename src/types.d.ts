type ArgumentValue = OptionalReadonly<string | boolean | (string | boolean)[]>;

type RegisteredOpt = {
  prompted: boolean,
  value: ArgumentValue,
};

type ExtraOptionData = {
  default: OptionalReadonly<ArgumentValue>;
} & ({ prompt: true; message: string } | { prompt: false }) & ({
  type: 'boolean',
} | {
  type: 'multiselect',
  options: OptionalReadonly<Parameters<typeof import('@clack/prompts')['multiselect']>['0']['options']>,
} | {
  type: 'select',
  options: OptionalReadonly<Parameters<typeof import('@clack/prompts')['select']>['0']['options']>,
} | {
  type?: 'text',
});

type ThemeConfig = {
  name: string,
  description: string,
  author: string,
  version: string,
  inputFile?: string,
};

type OptionalReadonly<T> = Readonly<T> | T;
