/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '@mdx-js/runtime' {
  import { FunctionComponent } from 'react';
  import { Options } from '@mdx-js/mdx';
  import { ComponentsProp } from '@mdx-js/react';

  /**
   * Properties for the MDX Runtime component
   */
  export interface MDXRuntimeProps
    extends Omit<Options, 'footnotes' | 'compilers'>,
      ComponentsProp {
    /**
     * MDX text
     */
    children: string;

    /**
     * Values in usable in MDX scope
     */
    scope: {
      [variableName: string]: unknown;
    };
  }

  /**
   * Renders child MDX text as a React component
   */
  declare const mdxRuntime: FunctionComponent<Partial<MDXRuntimeProps>>;

  export default mdxRuntime;
}

declare module '@babel/plugin-transform-typescript' {
  import { PluginItem } from '@babel/core';
  const plugin: PluginItem;
  export default plugin;
}

declare module '@babel/plugin-transform-modules-commonjs' {
  import { PluginItem } from '@babel/core';
  const plugin: PluginItem;
  export default plugin;
}

declare module '@babel/plugin-transform-react-jsx' {
  import { PluginItem } from '@babel/core';
  const plugin: PluginItem;
  export default plugin;
}

declare module '@babel/standalone' {
  import { BabelFileResult, TransformOptions, Node } from '@babel/core';
  export function transform(
    code: string,
    options: TransformOptions
  ): BabelFileResult;
  export function transformFromAst(
    ast: Node,
    code?: string,
    options: TransformOptions
  ): BabelFileResult;
}

// this can be removed when @types/prettier have updated to take the
// babel => babylon rename into account
declare module 'prettier/parser-babel' {
  import plugin from 'prettier/parser-babylon';
  export = plugin;
}
