import * as t from '@babel/types';
import generate from '@babel/generator';
import template from "@babel/template";
import icuToReactComponent, { Formats } from './icu-to-react-component';

interface Messages {
  [key: string]: string
}

function createExports (messages: Messages, options: IcurOptions): t.Statement[] {
  return ([] as t.Statement[]).concat(
    ...Object.entries(messages)
      .map(([componentName, message]) => {
        const { ast } = icuToReactComponent(componentName, message, options);
        return [
          t.exportNamedDeclaration(ast, [])
        ];
      })
  );
}

export interface IcurOptions {
  locale?: string
  formats?: Partial<Formats>
}

export default function createModule (messages: Messages, options: IcurOptions = {}) {
  const program = t.program([
    template.ast`import * as React from 'react';` as t.Statement,
    ...createExports(messages, options)
  ]);
  return {
    code: generate(program).code,
    ast: program
  };
}
