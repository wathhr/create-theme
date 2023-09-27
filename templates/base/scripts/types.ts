import { Drafts } from 'lightningcss';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

export type ThemeConfig = {
  $schema?: string,
  author: string,
  description: string,
  inputFile: string,
  name: string,
  paths?: Record<string, string[]>,
  preferredClient?: string,
  targets?: string | readonly string[],
  version: string,

  // lightningcss stuff
  drafts?: Drafts,
  /**
   * @see {@link https://lightningcss.dev/transpilation.html#feature-flags} for further information.
   */
  features?: number,
};

export type ClientExport = (config: ThemeConfig, pkg: JSONSchemaForNPMPackageJsonFiles) => {
  name: string,
  fileName: string,
  drafts?: Drafts,
  /**
   * @see {@link https://lightningcss.dev/transpilation.html#feature-flags} for further information.
   */
  features?: number,
  targets?: string | readonly string[],
} & (archiveTypes | fileTypes);

type Extras = {
  args: Record<string, any>, // TODO: Improve type
  clientExport: ReturnType<ClientExport>,
  config: ThemeConfig,
  pkg: JSONSchemaForNPMPackageJsonFiles,
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
