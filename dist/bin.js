// src/index.ts
import { copy, ensureDir, exists } from "../node_modules/fs-extra/lib/index.js";
import { join as join3 } from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import commandExists from "../node_modules/command-exists/index.js";
import { intro, outro, spinner as spinnerInit } from "../node_modules/@clack/prompts/dist/index.mjs";

// src/utils/manageOpts.ts
import * as clack from "../node_modules/@clack/prompts/dist/index.mjs";

// src/constants/misc.ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var root = join(__dirname, "..");
var metaFiles = [
  "index.json",
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
import { join as join2 } from "node:path";
import { readdir } from "node:fs/promises";
var options = {
  defaults: {
    type: "boolean"
  },
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
  language: {
    type: "string"
  },
  extras: {
    type: "string",
    multiple: true
  }
};
var extraOptionData = {
  defaults: {
    prompt: false,
    default: false
  },
  name: {
    prompt: true,
    message: "What should the name of your theme be?",
    default: "my-theme"
  },
  description: {
    prompt: true,
    message: "What should the description be?",
    default: "A discord theme."
  },
  author: {
    prompt: true,
    message: "Who is the author?",
    default: "Author"
  },
  version: {
    prompt: false,
    default: "0.0.1"
  },
  language: {
    prompt: true,
    message: "What language do you want to use?",
    type: "select",
    options: (await readdir(join2(root, "templates"), { withFileTypes: true })).filter((dir) => dir.isDirectory() && dir.name !== "base").map(({ name }) => {
      return {
        value: name,
        label: name[0].toUpperCase() + name.slice(1)
      };
    }),
    default: "css"
  },
  extras: {
    prompt: true,
    message: "Select additional options (use arrow keys/space bar)",
    type: "multiselect",
    options: [
      { value: "ghAction", label: "GitHub build & release action" }
    ],
    default: []
  }
};

// src/utils/manageOpts.ts
var registeredOpts = /* @__PURE__ */ new Map();
async function register(name, arg) {
  if (registeredOpts.has(name))
    throw new Error(`"${name}" is already registered.`);
  const extra = extraOptionData[name];
  const prompted = !useDefaults && arg === void 0 && extra.prompt;
  const value = arg ?? await (async () => {
    if (!prompted)
      return extra.default;
    if (!("type" in extra))
      return await clack.text({
        message: extra.message,
        defaultValue: extra.default,
        placeholder: extra.default
      });
    switch (extra.type) {
      case "select": {
        return await clack.select({
          message: extra.message,
          options: extra.options,
          initialValue: extra.default
        });
      }
      case "multiselect": {
        return await clack.multiselect({
          message: extra.message,
          options: extra.options,
          initialValues: extra.default,
          required: false
        });
      }
    }
  })();
  if (clack.isCancel(value)) {
    clack.cancel("Operation cancelled.");
    process.exit(0);
  }
  if (typeof value === "symbol") {
    clack.cancel("Received unexpected value");
    process.exit(1);
  }
  if ("type" in extra) {
    if (extra.type === "select" && !extra.options.find((opt) => opt.value === value) || extra.type === "multiselect" && !value.every((val) => extra.options.find((opt) => opt.value === val))) {
      throw new Error(`"${value}" is not a valid value for option "${name}"`);
    }
  }
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
  const content = await readFile(file, "utf8").catch((e) => {
    throw new Error(`Failed to read file, "${file}"`, e);
  });
  const regex = new RegExp(`__theme(${requiredConfigKeys.map((key) => key[0].toUpperCase() + key.slice(1)).join("|")})__`, "g");
  const newContent = content.replace(regex, (_, group) => {
    return (registeredOpts.get(group.toLowerCase())?.value ?? extraOptionData[group].default).toString();
  });
  await writeFile(file, newContent).catch((e) => {
    throw new Error(`Failed to write file, "${file}"`, e);
  });
}

// src/index.ts
var { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false
});
var useDefaults = values.defaults ?? false;
intro("Discord theme creator");
for (const o in options) {
  const opt = o;
  await register(opt, values[opt]);
}
var spinner = spinnerInit();
spinner.start();
spinner.message("Copying project files...");
var path = join3(process.cwd(), registeredOpts.get("name").value.toString());
await ensureDir(path);
await copy(join3(root, "templates/base"), path, {
  overwrite: false,
  errorOnExist: true
});
await copy(join3(root, "templates", registeredOpts.get("language").value.toString()), path);
spinner.message("Replacing metadata...");
for (const file of metaFiles) {
  const filePath = join3(path, file);
  if (!exists(filePath))
    continue;
  await replaceMeta(filePath);
}
if (exists(join3(path, "package.json"))) {
  spinner.message("Installing packages...");
  const packageManagers = ["yarn", "pnpm", "npm"];
  const opts = { cwd: path };
  if (process.env.npm_execpath) {
    spawnSync(process.env.npm_execpath, ["install"], opts);
    packageManagers.length = 0;
  }
  for (const pm of packageManagers) {
    if (commandExists.sync(pm)) {
      spawnSync(pm, ["install"], opts);
      break;
    }
  }
}
spinner.stop();
outro("Done!");
export {
  useDefaults
};
