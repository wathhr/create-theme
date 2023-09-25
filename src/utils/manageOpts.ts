import * as clack from '@clack/prompts';
import type { ArgumentValue, RegisteredOptions } from '@root/types';
import { useDefaults } from '..';
import { extraOptionData, options } from '@constants';

export const registeredOpts = {} as RegisteredOptions;

export async function register(name: keyof typeof options, arg: ArgumentValue) {
  const extra = extraOptionData[name];
  const prompted = !useDefaults && arg === undefined && extra.prompt;

  const value: ArgumentValue | typeof extra['default'] | symbol = arg ?? await (async (): Promise<typeof extra['default'] | symbol> => {
    if (!prompted) return extra.default;
    if (!('type' in extra)) return await clack.text({
      message: extra.message,
      defaultValue: extra.default.toString(),
      placeholder: extra.default.toString(),
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
    process.exit(1);
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

  // @ts-expect-error idk how to fix `values`'s type, checks are made so this works fine
  return registeredOpts[name] = { prompted, value };
}
