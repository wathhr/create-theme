import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { useDefaults } from '.';
import { extraOptionData } from '@constants';

export const registeredOpts = new Map<string, RegisteredOpt>();

const rl = readline.createInterface({ input, output });
export async function register(name: string, arg: ArgumentValue, prompt = true) {
  if (registeredOpts.has(name)) throw new Error(`"${name}" is already registered.`);
  const prompted = arg === undefined && !useDefaults && prompt;

  const value: ArgumentValue = arg
    ?? (prompted
      ? await rl.question(name + ': ')
      : extraOptionData[name].default);

  rl.pause();

  const result: RegisteredOpt = {
    prompted,
    value
  };

  registeredOpts.set(name, result);
  return result;
}
