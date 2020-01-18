import * as t from '@babel/types';
import template from '@babel/template';
import Scope from './scope';
import { IcurOptions } from '.';
import icuToReactComponent, { Formats } from './icu-to-react-component';
import IntlMessageFormat from 'intl-messageformat';

const buildFormatter = template.expression(`
  new Intl.%%format%%(%%locale%%, %%options%%)
`);

function getIntlFormatter(type: keyof Formats): string {
  switch (type) {
    case 'number':
      return 'NumberFormat';
    case 'date':
      return 'DateTimeFormat';
    case 'time':
      return 'DateTimeFormat';
  }
}

function mergeFormats(...formattersList: Partial<Formats>[]): Formats {
  return {
    number: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.number)
    ),
    date: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.date)
    ),
    time: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.time)
    )
  };
}

interface Export {
  localName: string;
  ast: t.Expression;
}

interface Formatter {
  localName: string;
  type: keyof Formats;
  style: string;
}

export default class Module {
  scope: Scope;
  exports: Map<string, Export>;
  formatters: Map<string, Formatter>;
  locale?: string;
  formats: Formats;

  constructor(options: IcurOptions) {
    this.scope = new Scope();
    this.scope.createBinding('React');
    this.exports = new Map();
    this.formatters = new Map();
    this.locale = options.locale;
    this.formats = mergeFormats(
      IntlMessageFormat.formats,
      options.formats || {}
    );
  }

  useFormatter(type: keyof Formats, style: string): t.Identifier {
    const formatterKey = JSON.stringify([type, style]);

    const formatter = this.formatters.get(formatterKey);
    if (formatter) {
      return t.identifier(formatter.localName);
    }

    const localName = this.scope.createUniqueBinding(`${type}_${style}`);
    this.formatters.set(formatterKey, { localName, type, style });

    return t.identifier(localName);
  }

  addMessage(componentName: string, message: string) {
    if (this.exports.has(componentName)) {
      throw new Error(
        `A component named "${componentName}" was already defined`
      );
    }

    const localName = this.scope.hasBinding(componentName)
      ? this.scope.createUniqueBinding(componentName)
      : this.scope.createBinding(componentName);

    const { ast } = icuToReactComponent(localName, message, this);

    this.exports.set(componentName, { localName, ast });
  }

  getLocaleAsAst(): t.Expression {
    return this.locale
      ? t.stringLiteral(this.locale)
      : t.identifier('undefined');
  }

  _getFormatOptionsAsAst(type: keyof Formats, style: string): t.Expression {
    const format = this.formats[type][style];
    if (format) {
      return t.objectExpression(
        Object.entries(format).map(([key, value]) => {
          return t.objectProperty(t.identifier(key), t.stringLiteral(value));
        })
      );
    } else {
      return t.identifier('undefined');
    }
  }

  _buildFormatterAst(formatter: Formatter): t.Statement {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(formatter.localName),
        buildFormatter({
          format: t.identifier(getIntlFormatter(formatter.type)),
          locale: this.getLocaleAsAst(),
          options: this._getFormatOptionsAsAst(formatter.type, formatter.style)
        })
      )
    ]);
  }

  buildModuleAst() {
    const formatterDeclarations = Array.from(
      this.formatters.values(),
      formatter => {
        return this._buildFormatterAst(formatter);
      }
    );
    const componentDeclarations: t.Statement[] = [];
    const exportSpecifiers: t.ExportSpecifier[] = [];
    for (const [componentName, { localName, ast }] of this.exports.entries()) {
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
      ...formatterDeclarations,
      ...componentDeclarations,
      t.exportNamedDeclaration(null, exportSpecifiers)
    ];
  }
}
