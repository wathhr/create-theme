import { Drafts, Features } from 'lightningcss';

export type ThemeConfig = {
  $schema?: string,
  name: string,
  description: string,
  author: string,
  version: string,
  inputFile: string,
  preferredClient?: string,

  // lightningcss stuff
  drafts?: Drafts,
  features?: typeof Features,
};

export type ClientExport = (config: ThemeConfig) => {
  name: string,
  fileName: string,
  drafts?: Drafts,
  features?: typeof Features,
  targets?: string | readonly string[],
} & (archiveTypes | fileTypes);

type Extras = {
  args: Record<string, any>, // TODO: Improve type
  clientExport: ReturnType<ClientExport>,
  config: ThemeConfig,
  root: string,
};

// 🥰🥰🥰
type PreprocessSync = (file: string, extras: Extras) => string;
type PreprocessAsync = (file: string, extras: Extras) => Promise<string>;
type PostprocessSync = (file: string, content: string, extras: Extras) => string;
type PostprocessAsync = (file: string, content: string, extras: Extras) => Promise<string>;
export type PreprocessExport = PreprocessSync | PreprocessAsync;
export type PostprocessExport = PostprocessSync | PostprocessAsync;

type archiveTypes = {
  type: 'asar',
  /**
   * `tmpDir` is the directory that gets packed
   *
   * @example
   * async compile(content, root, tmpDir) {
   *   await fs.copyFile(join(root, 'manifest.json'), join(tmpDir, 'manifest.json'));
   *   await fs.writeFile(join(tmpDir, 'dist.css'), content);
   * }
   * @param content The compiled css
   * @param root The root directory of the theme
   * @param tmpDir A temporary directory
   */
  compile(content: string, root: string, tmpDir: string): void | Promise<void>,
};
type fileTypes = {
  type: 'file',
  compile(content: string): string,
};
