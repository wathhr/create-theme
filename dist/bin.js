// src/index.ts
import { parseArgs } from "node:util";
import { join as join2 } from "node:path";
import { copy } from "../node_modules/fs-extra/lib/index.js";

// src/manageOpts.ts
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

// src/constants/misc.ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var root = join(__dirname, "..");
var metaFiles = [
  "manifest.json",
  "theme.config.json"
];
var requiredConfigKeys = [
  "name",
  "author",
  "description",
  "version"
];

// src/constants/options.ts
var options = {
  name: {
    type: "string",
    short: "n"
  },
  description: {
    type: "string"
  },
  author: {
    type: "string",
    short: "a",
    multiple: true
  },
  version: {
    type: "string"
  },
  defaults: {
    type: "boolean"
  }
};
var extraOptionData = {
  name: {
    default: "my-theme",
    prompt: true
  },
  description: {
    default: "A discord theme.",
    prompt: true
  },
  author: {
    default: "me",
    prompt: true
  },
  version: {
    default: "1.0.0",
    prompt: false
  },
  defaults: {
    default: false,
    prompt: false
  }
};

// src/manageOpts.ts
var registeredOpts = /* @__PURE__ */ new Map();
var rl = readline.createInterface({ input, output });
async function register(name, arg, prompt = true) {
  if (registeredOpts.has(name))
    throw new Error(`"${name}" is already registered.`);
  const prompted = arg === void 0 && !useDefaults && prompt;
  const value = arg ?? (prompted ? await rl.question(name + ": ") : extraOptionData[name].default);
  rl.pause();
  const result = {
    prompted,
    value
  };
  registeredOpts.set(name, result);
  return result;
}

// src/utils/replaceMeta.ts
import { readFile, writeFile } from "node:fs/promises";
async function replaceMeta(file) {
  const content = await readFile(file, "utf8");
  const regex = new RegExp(`__theme(${requiredConfigKeys.map((key) => key[0].toUpperCase() + key.slice(1)).join("|")})__`, "g");
  const newContent = content.replace(regex, (_, group) => {
    return (registeredOpts.get(group.toLowerCase())?.value ?? extraOptionData[group].default).toString();
  });
  await writeFile(file, newContent);
}

// src/index.ts
var { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false
});
var useDefaults = values.defaults ?? false;
for (const opt in options) {
  await register(opt, values[opt], extraOptionData[opt].prompt);
}
var path = join2(process.cwd(), registeredOpts.get("name").value.toString());
await copy(join2(root, "template"), path, {
  overwrite: false,
  errorOnExist: true
});
for (const file of metaFiles) {
  const filePath = join2(path, file);
  await replaceMeta(filePath);
}
export {
  useDefaults
};
