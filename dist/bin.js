#!/usr/bin/env node

// src/index.ts
import { ensureDir, exists as exists2 } from "fs-extra";
import { readdir as readdir3 } from "node:fs/promises";
import { join as join4, resolve } from "node:path";
import { parseArgs } from "node:util";
import commandExists from "command-exists";
import spawn from "cross-spawn";
import * as clack2 from "@clack/prompts";

// src/utils/manageOpts.ts
import * as clack from "@clack/prompts";

// src/constants/misc.ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var root = join(__dirname, "..");
var configKeys = [
  "name",
  "author",
  "description",
  "version",
  "inputFile"
];
var metaFiles = [
  "index.json",
  "theme.config.json"
];
var addMetaFiles = (...files) => metaFiles.push(...files);

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
    default: ["Author"]
  },
  version: {
    prompt: false,
    default: "0.0.1"
  },
  language: {
    prompt: true,
    message: "What language do you want to use?",
    type: "select",
    options: (await readdir(join2(root, "templates/languages"), { withFileTypes: true })).map(({ name }) => {
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
    options: (await readdir(join2(root, "templates/extras"), { withFileTypes: true })).map(({ name }) => {
      return {
        value: name,
        label: name.split(/[\s_-]/).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
      };
    }),
    default: []
  }
};

// src/utils/manageOpts.ts
var registeredOpts = {};
async function register(name, arg) {
  const extra = extraOptionData[name];
  const prompted = !useDefaults && arg === void 0 && extra.prompt;
  const value = arg ?? await (async () => {
    if (!prompted)
      return extra.default;
    if (!("type" in extra))
      return await clack.text({
        message: extra.message,
        defaultValue: extra.default.toString(),
        placeholder: extra.default.toString()
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
    process.exit(1);
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
  return registeredOpts[name] = { prompted, value };
}

// src/utils/mergeDirs.ts
import { copy, exists } from "fs-extra";
import { join as join3, relative } from "path";
import { lstat, readFile, readdir as readdir2, writeFile } from "fs/promises";
import deepMerge from "ts-deepmerge";
var specialExts = [
  "json"
];
async function mergeDirs(mainDir, ...dirs) {
  async function skipCopy(file, mainFilePath, stat) {
    const extension = file.split(".").pop();
    const shouldSkip = (
      // Skip if:
      file.endsWith("$data.json") || // the name of the file is `$data.json`
      /node_modules/.test(mainFilePath) || //  OR it's in node_modules
      specialExts.includes(extension) && //  OR it has a special extension
      (stat ?? await lstat(file)).isFile() && // AND it's a file
      await exists(mainFilePath)
    );
    return shouldSkip;
  }
  for (const dir of dirs) {
    await copy(dir, mainDir, {
      overwrite: true,
      errorOnExist: false,
      async filter(file) {
        const mainFilePath = join3(mainDir, relative(dir, file));
        const skip = await skipCopy(file, mainFilePath);
        return !skip;
      }
    });
    const files = await readdir2(dir, { withFileTypes: true });
    for (const dirent of files) {
      const fileName = dirent.name;
      const mainFilePath = join3(mainDir, fileName);
      if (!await skipCopy(fileName, mainFilePath, dirent) || /node_modules/.test(mainFilePath))
        continue;
      const fileExt = fileName.split(".").pop();
      if (fileName === "$data.json") {
        const data = JSON.parse(await readFile(join3(dir, fileName), "utf8"));
        addMetaFiles(...data?.metaFiles ?? []);
        continue;
      }
      try {
        await writeFile(mainFilePath, await (async () => {
          switch (fileExt) {
            case "json":
              return await mergeJson(mainFilePath, join3(dir, fileName));
            default:
              throw new Error(`Unexpected file extension: "${fileName}"`);
          }
        })());
      } catch (e) {
        console.error(`Failed to write file to: "${mainFilePath}"`, e);
      }
    }
  }
}
async function mergeJson(...files) {
  const objects = await Promise.all(files.map(async (file) => {
    try {
      return await readFile(file, "utf8").then(JSON.parse);
    } catch (e) {
      throw new Error(`Failed to require "${file}"`, e);
    }
  }));
  try {
    const merged = deepMerge(...objects);
    return JSON.stringify(merged, null, 2);
  } catch (e) {
    throw new Error(`Failed to combine JSON files [${files}]:`, e);
  }
}

// src/utils/replaceMeta.ts
import { readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
async function replaceMeta(file) {
  const content = await readFile2(file, "utf8").catch((e) => {
    throw new Error(`Failed to read "${file}":`, e);
  });
  const regex = new RegExp(`__theme(${configKeys.map((key) => key[0].toUpperCase() + key.slice(1)).join("|")})__`, "g");
  const newContent = content.replace(regex, (_, group) => {
    return registeredOpts[group.toLowerCase()].value ?? extraOptionData[group].default;
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
var themePath = resolve(process.cwd(), registeredOpts.path.value);
var baseTemplate = join4(root, "templates/base");
var languageTemplate = join4(root, "templates/languages", registeredOpts.language.value);
var extrasTemplates = registeredOpts.extras.value.map((e) => join4(root, "templates/extras", e));
var spinner2 = clack2.spinner();
spinner2.start("Copying project files...");
await ensureDir(themePath);
if ((await readdir3(themePath)).length > 0) {
  const force = await clack2.confirm({
    message: "The selected directory is not empty, do you want to continue?",
    initialValue: false
  });
  if (force !== true)
    process.exit(1);
}
await mergeDirs(themePath, baseTemplate, languageTemplate, ...extrasTemplates);
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
  spawn.sync(process.env.npm_execpath, ["install"], opts);
  packageManagers.length = 0;
}
for (const pm of packageManagers) {
  if (commandExists.sync(pm)) {
    spawn.sync(pm, ["install"], opts);
    break;
  }
}
spinner2.stop();
clack2.outro("Done!");
export {
  useDefaults
};
