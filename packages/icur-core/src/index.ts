import * as t from '@babel/types';
import generate from '@babel/generator';
import template from '@babel/template';
import icuToReactComponent, { Formats } from './icu-to-react-component';
import Scope from './scope';
import { codeFrameColumns, BabelCodeFrameOptions } from '@babel/code-frame';

interface Messages {
  [key: string]: string;
}

export interface IcurOptions {
  locale?: string;
  formats?: Partial<Formats>;
}

interface Location {
  start: Position;
  end: Position;
}

interface Position {
  offset: number;
  line: number;
  column: number;
}

export function formatError(
  input: string,
  err: Error & { location?: Location; loc?: Position },
  options?: BabelCodeFrameOptions
): string {
  const location =
    err.location || (err.loc && { start: err.loc, end: err.loc });
  if (!location) {
    return err.message;
  }
  return codeFrameColumns(input, location, {
    message: err.message
  });
}

export default function createModule(
  messages: Messages,
  options: IcurOptions = {}
) {
  const messagesEntries = Object.entries(messages).map(
    ([componentName, message]) => {
      return [t.toIdentifier(componentName), message];
    }
  );

  const scope = new Scope();
  scope.registerBinding('React');
  for (const [componentName] of messagesEntries) {
    scope.registerBinding(componentName);
  }

  const program = t.program([
    template.ast`import * as React from 'react';` as t.Statement,
    ...messagesEntries.map(([componentName, message]) => {
      const { ast } = icuToReactComponent(componentName, message, {
        ...options,
        scope
      });
      return t.exportNamedDeclaration(ast, []);
    })
  ]);
  return {
    code: generate(program).code,
    ast: program
  };
}
