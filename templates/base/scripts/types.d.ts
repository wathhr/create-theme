import { Drafts } from 'lightningcss';

export type ThemeConfig = {
  $schema?: string,
  // common meta
  name: string,
  author: string,
  description: string,
  version: string,

  // code-related
  inputFile: string,
  splashInputFile?: string,
  paths?: Record<string, string[]>,

  // auto-install related
  autoInstall?: boolean | OptionalArray<keyof ThemeConfig['clientDist']>,
  clientDist?: Record<
    // TODO: Make this use the exports of the `./helpers/clients.js` file somehow
    'betterDiscord' | 'stylus' | 'replugged' | 'popcorn' | string,
    string
  >,

  // lightningcss stuff
  drafts?: Drafts,
  /** @see {@link https://lightningcss.dev/transpilation.html#feature-flags} for further information. */
  features?: number,
  /** @see {@link https://github.com/browserslist/browserslist#full-list} for further information. */
  targets?: string | readonly string[],
};

export type Args = {
  input: string,
  splashInput?: string,
  output: string,
  client: string[],
  watch: boolean,
};

type Extras = {
  args: Args,
  clientExport: ClientExport,
};

// 🥰🥰🥰
type PreprocessSync = (file: string, extras: Extras) => string;
type PreprocessAsync = (file: string, extras: Extras) => Promise<string>;
type PostprocessSync = (file: string, content: string, extras: Extras) => string;
type PostprocessAsync = (file: string, content: string, extras: Extras) => Promise<string>;
export type PreprocessExport = PreprocessSync | PreprocessAsync;
export type PostprocessExport = PostprocessSync | PostprocessAsync;

export type ClientExport = {
  name: string,
  fileName: string,
  splash?: boolean,
  postRun?(): void | Promise<void>,

  // lightningcss stuff
  drafts?: Drafts,
  /** @see {@link https://lightningcss.dev/transpilation.html#feature-flags} for further information. */
  features?: number,
  /** @see {@link https://github.com/browserslist/browserslist#full-list} for further information. */
  targets?: string | readonly string[],
} & (archiveTypes | fileTypes);

type archiveTypes = {
  type: 'asar' | 'zip',
  /**
   * `tmpDir` is the directory that gets packed
   *
   * @param data.content The compiled css
   * @param data.splashContent The compiled css for the splashscreen (only available when `splash` is truthy & `splashInputFile` is set)
   * @param data.tmpDir A temporary directory
   *
   * @example
   * async compile({ content, root, tmpDir }) {
   *   await fs.copyFile(join(root, 'manifest.json'), join(tmpDir, 'manifest.json'));
   *   await fs.writeFile(join(tmpDir, 'dist.css'), content);
   * }
   */
  compile(data: { content: string, splashContent?: string, tmpDir: string; }): void | Promise<void>,
};
type fileTypes = {
  type: 'file',
  compile(content: string): string,
};

type OptionalArray<T> = T | T[];
