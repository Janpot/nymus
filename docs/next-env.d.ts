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
