import * as t from '@babel/types';
import template from '@babel/template';
import Scope from './scope';
import { IcurOptions } from '.';
import icuToReactComponent, { Formats } from './icu-to-react-component';

interface Export {
  localName: string;
  ast: t.Expression;
}

export default class Module {
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

  addMessage(componentName: string, message: string) {
    if (this.exports.has(componentName)) {
      throw new Error(
        `A component named "${componentName}" was already defined`
      );
    }

    const localName = this.scope.hasBinding(componentName)
      ? this.scope.generateUid(componentName)
      : componentName;
    this.scope.registerBinding(localName);

    const { ast } = icuToReactComponent(localName, message, {
      locale: this.locale,
      formats: this.formats,
      scope: this.scope
    });

    this.exports.set(componentName, { localName, ast });
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
          t.variableDeclarator(t.identifier(localName), ast)
        ])
      );
      exportSpecifiers.push(
        t.exportSpecifier(t.identifier(localName), t.identifier(componentName))
      );
    }
    return [
      template.ast`import * as React from 'react';` as t.Statement,
      ...componentDeclarations,
      t.exportNamedDeclaration(null, exportSpecifiers)
    ];
  }
}
