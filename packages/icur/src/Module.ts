import * as t from '@babel/types';
import template from '@babel/template';
import Scope from './scope';
import { IcurOptions } from '.';
import IntlMessageFormat from 'intl-messageformat';
import icuToReactComponent, { Formats } from './icu-to-react-component';
import { buildJsonAst } from './astUtils';

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

interface SharedConst {
  localName: string;
  init: t.Expression;
}

export default class Module {
  readonly scope: Scope;
  readonly exports: Map<string, Export>;
  readonly formatters: Map<string, Formatter>;
  readonly _sharedConsts: Map<string, SharedConst>;
  readonly locale?: string;
  readonly formats: Formats;

  constructor(options: IcurOptions) {
    this.scope = new Scope();
    this.scope.createBinding('React');
    this.exports = new Map();
    this.formatters = new Map();
    this._sharedConsts = new Map();
    this.locale = options.locale;
    this.formats = mergeFormats(
      IntlMessageFormat.formats,
      options.formats || {}
    );
  }

  _useSharedConst(
    key: string,
    name: string,
    build: () => t.Expression
  ): t.Identifier {
    const sharedConst = this._sharedConsts.get(key);
    if (sharedConst) {
      return t.identifier(sharedConst.localName);
    }

    const localName = this.scope.createUniqueBinding(name);
    this._sharedConsts.set(key, { localName, init: build() });
    return t.identifier(localName);
  }

  useFormatter(type: keyof Formats, style: string): t.Identifier {
    const sharedKey = JSON.stringify(['formatter', type, style]);

    return this._useSharedConst(sharedKey, `f_${type}_${style}`, () => {
      return buildFormatter({
        format: t.identifier(getIntlFormatter(type)),
        locale: this.getLocaleAsAst(),
        options: this._getFormatOptionsAsAst(type, style)
      });
    });
  }

  usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier {
    const sharedKey = JSON.stringify(['plural', type]);

    return this._useSharedConst(sharedKey, `p_${type}`, () => {
      return buildFormatter({
        format: t.identifier('PluralRules'),
        locale: this.getLocaleAsAst(),
        options: type ? buildJsonAst({ type }) : t.identifier('undefined')
      });
    });
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
    return format ? buildJsonAst(format) : t.identifier('undefined');
  }

  _buildSharedConstAst(sharedConst: SharedConst): t.Statement {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(sharedConst.localName),
        sharedConst.init
      )
    ]);
  }

  buildModuleAst() {
    const formatterDeclarations = Array.from(
      this._sharedConsts.values(),
      sharedConst => this._buildSharedConstAst(sharedConst)
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
