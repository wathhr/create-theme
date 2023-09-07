import * as clack from '@clack/prompts';
import type { ArgumentValue, RegisteredOpt } from '@root/types';
import { useDefaults } from '..';
import { extraOptionData, options } from '@constants';

export const registeredOpts = new Map<string, RegisteredOpt>(); // TODO: Make this more typesafe

export async function register(name: keyof typeof options, arg: ArgumentValue) {
  if (registeredOpts.has(name)) throw new Error(`"${name}" is already registered.`);
  const extra = extraOptionData[name];
  const prompted = !useDefaults && arg === undefined && extra.prompt;

  const value: ArgumentValue | symbol = arg ?? await (async (): Promise<ArgumentValue | symbol> => {
    if (!prompted) return extra.default;
    if (!('type' in extra)) return await clack.text({
      message: extra.message,
      defaultValue: extra.default,
      placeholder: extra.default,
    });

    switch (extra.type) {
      case 'select': {
        return await clack.select({
          message: extra.message,
          options: extra.options,
          initialValue: extra.default,
        });
      }
      case 'multiselect': {
        return await clack.multiselect({
          message: extra.message,
          options: extra.options,
          initialValues: extra.default,
          required: false,
        });
      }
    }
  })();

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }
  if (typeof value === 'symbol') {
    clack.cancel('Received unexpected value');
    process.exit(1);
  }

  if ('type' in extra) {
    if ((
      extra.type === 'select' &&
      !extra.options.find((opt) => opt.value === value)
    ) || (
      extra.type === 'multiselect' &&
      !(value as string[]).every((val) => extra.options.find((opt) => opt.value === val))
    )) {
      throw new Error(`"${value}" is not a valid value for option "${name}"`);
    }
  }

  const result: RegisteredOpt = {
    prompted,
    value
  };

  registeredOpts.set(name, result);
  return result;
}
