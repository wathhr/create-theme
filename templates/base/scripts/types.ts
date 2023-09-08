import { Drafts, Features } from 'lightningcss';

export type ThemeConfig = {
  $schema?: string,
  name: string,
  description: string,
  author: string,
  version: string,
  inputFile: string,
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
