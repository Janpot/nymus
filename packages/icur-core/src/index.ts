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

interface Export {
  localName?: string;
  ast?: t.Expression;
}

class ModuleContext {
  scope: Scope;
  exports: Map<string, Export>;
  locale?: string;
  formats?: Partial<Formats>;

  constructor(options: IcurOptions) {
    this.scope = new Scope();
    this.scope.registerBinding('React');
    this.exports = new Map();
    this.locale = options.locale;
    this.formats = options.formats;
  }

  registerExports(componentNames: string[]) {
    for (const componentName of componentNames) {
      if (this.scope.hasBinding(componentName)) {
        const localName = this.scope.generateUid(componentName);
        this.scope.registerBinding(localName);
        this.exports.set(componentName, { localName });
      } else {
        this.scope.registerBinding(componentName);
        this.exports.set(componentName, {});
      }
    }
  }

  addMessage(componentName: string, message: string) {
    const exported = this.exports.get(componentName);
    if (!exported) {
      throw new Error(`No export registered for "${componentName}"`);
    }
    const { ast } = icuToReactComponent(
      exported.localName || componentName,
      message,
      {
        locale: this.locale,
        formats: this.formats,
        scope: this.scope
      }
    );
    exported.ast = ast;
  }

  buildModuleAst() {
    const componentDeclarations: t.Statement[] = [];
    const exportSpecifiers: t.ExportSpecifier[] = [];
    for (const [componentName, { localName, ast }] of this.exports.entries()) {
      if (!ast) {
        continue;
      }
      componentDeclarations.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier(localName || componentName), ast)
        ])
      );
      exportSpecifiers.push(
        t.exportSpecifier(
          t.identifier(localName || componentName),
          t.identifier(componentName)
        )
      );
    }
    return [
      template.ast`import * as React from 'react';` as t.Statement,
      ...componentDeclarations,
      t.exportNamedDeclaration(null, exportSpecifiers)
    ];
  }
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

  const moduleContext = new ModuleContext(options);

  moduleContext.registerExports(
    messagesEntries.map(([componentName]) => componentName)
  );

  for (const [componentName, message] of messagesEntries) {
    moduleContext.addMessage(componentName, message);
  }

  const program = t.program(moduleContext.buildModuleAst());
  return {
    code: generate(program).code,
    ast: program
  };
}
