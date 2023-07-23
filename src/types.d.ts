type ArgumentValue = string | boolean | (string | boolean)[];

type RegisteredOpt = {
  prompted: boolean;
  value: ArgumentValue;
}

type ExtraOptionData = {
  default?: ArgumentValue;
  prompt?: boolean;
}

type ThemeConfig = {
  name: string;
  description: string;
  author: string;
  version: string;
}
