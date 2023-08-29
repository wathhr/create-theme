#!/usr/bin/env node

// src/index.ts
import { ensureDir, exists as exists2 } from "fs-extra";
import { readdir as readdir3 } from "node:fs/promises";
import { join as join4, resolve } from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import commandExists from "command-exists";
import * as clack2 from "@clack/prompts";

// src/utils/manageOpts.ts
import * as clack from "@clack/prompts";

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
  path: {
    type: "string",
    short: "p"
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
    type: "string",
    short: "l"
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
  path: {
    prompt: true,
    message: "What should the theme path be?",
    default: "."
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
        label: name.split(/[\s_-]/).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
      };
    }),
    default: "css"
  },
  extras: {
    prompt: true,
    message: "Select additional options (use arrow keys/space bar)",
    type: "multiselect",
    // TODO: Somehow add a lightning css option if you didn't pick lightning css above
    options: [
      { value: "ghAction", label: "GitHub build & release action" }
    ],
    default: ["ghAction"]
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

// src/utils/mergeDirs.ts
import { copy, exists } from "fs-extra";
import { join as join3, relative } from "path";
import { lstat, readFile, readdir as readdir2, writeFile } from "fs/promises";
import deepMerge from "ts-deepmerge";
async function mergeJson(...files) {
  const objects = [];
  for (const file of files) {
    objects.push(JSON.parse(await readFile(file, "utf8")));
  }
  try {
    const merged = deepMerge(...objects);
    return JSON.stringify(merged, null, 2);
  } catch (e) {
    throw new Error(`Failed to combine JSON files [${files}]:`, e);
  }
}
async function mergeDirs(mainDir, ...dirs) {
  for (const dir of dirs) {
    await copy(dir, mainDir, {
      overwrite: true,
      errorOnExist: false,
      async filter(file) {
        const mainFilePath = join3(mainDir, relative(dir, file));
        return !(file.endsWith(".json") && (await lstat(file)).isFile() && await exists(mainFilePath));
      }
    });
    (await readdir2(dir, { withFileTypes: true })).forEach(async (file) => {
      const mainFilePath = join3(mainDir, file.name);
      if (!(file.name.endsWith(".json") && file.isFile() && await exists(mainFilePath)))
        return;
      const content = await mergeJson(mainFilePath, join3(dir, file.name));
      try {
        await writeFile(mainFilePath, content);
      } catch (e) {
        throw new Error(`Failed to write combined JSON "${mainFilePath}":`, e);
      }
    });
  }
}

// src/utils/replaceMeta.ts
import { readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
async function replaceMeta(file) {
  const content = await readFile2(file, "utf8").catch((e) => {
    throw new Error(`Failed to read "${file}":`, e);
  });
  const regex = new RegExp(`__theme(${requiredConfigKeys.map((key) => key[0].toUpperCase() + key.slice(1)).join("|")})__`, "g");
  const newContent = content.replace(regex, (_, group) => {
    return (registeredOpts.get(group.toLowerCase())?.value ?? extraOptionData[group].default).toString();
  });
  await writeFile2(file, newContent).catch((e) => {
    throw new Error(`Failed to write file "${file}":`, e);
  });
}

// src/index.ts
var { values } = parseArgs({
  args: process.argv.slice(2),
  options,
  allowPositionals: false
});
var useDefaults = values.defaults ?? false;
clack2.intro("Discord theme creator");
for (const o in options) {
  const opt = o;
  await register(opt, values[opt]);
}
var spinner2 = clack2.spinner();
spinner2.start();
spinner2.message("Copying project files...");
var themePath = resolve(process.cwd(), registeredOpts.get("path").value.toString());
var baseTemplate = join4(root, "templates/base");
var languageTemplate = join4(root, "templates", registeredOpts.get("language").value.toString());
await ensureDir(themePath);
if ((await readdir3(themePath)).length > 0) {
  const force = await clack2.confirm({
    message: "The selected directory is not empty, do you want to continue?",
    initialValue: false
  });
  if (force !== true)
    process.exit(1);
}
await mergeDirs(themePath, baseTemplate, languageTemplate);
spinner2.message("Replacing metadata...");
for (const file of metaFiles) {
  const filePath = join4(themePath, file);
  if (!exists2(filePath))
    continue;
  await replaceMeta(filePath);
}
spinner2.message("Installing packages...");
var packageManagers = ["yarn", "pnpm", "npm"];
var opts = { cwd: themePath };
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
spinner2.stop();
clack2.outro("Done!");
export {
  useDefaults
};
