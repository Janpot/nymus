import * as t from '@babel/types';
import Scope from './Scope';
import { CreateModuleOptions } from '.';
import createComponent, { FormatOptions } from './createComponent';
import * as astUtil from './astUtil';
import { Formats, mergeFormats } from './formats';

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

interface Export {
  localName: string;
  ast: t.Statement;
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
  readonly react: boolean;
  readonly scope: Scope;
  readonly exports: Map<string, Export>;
  readonly formatters: Map<string, Formatter>;
  readonly _sharedConsts: Map<string, SharedConst>;
  readonly locale?: string;
  readonly formats: Formats;

  constructor(options: CreateModuleOptions) {
    this.react = options.react || false;
    this.scope = new Scope();
    if (this.react) {
      this.scope.createBinding('React');
    }
    this.exports = new Map();
    this.formatters = new Map();
    this._sharedConsts = new Map();
    this.locale = options.locale;
    this.formats = mergeFormats(options.formats || {});
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

  buildFormatterAst(constructor: string, options?: astUtil.Json) {
    return t.newExpression(
      t.memberExpression(t.identifier('Intl'), t.identifier(constructor)),
      [
        this.locale ? t.stringLiteral(this.locale) : t.identifier('undefined'),
        options ? astUtil.buildJson(options) : t.identifier('undefined'),
      ]
    );
  }

  useFormatter(
    type: keyof Formats,
    style: string | FormatOptions
  ): t.Identifier {
    const sharedKey = JSON.stringify(['formatter', type, style]);

    return this._useSharedConst(sharedKey, type, () => {
      return this.buildFormatterAst(
        getIntlFormatter(type),
        typeof style === 'string' ? this.formats[type][style] : style
      );
    });
  }

  usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier {
    const sharedKey = JSON.stringify(['plural', type]);

    return this._useSharedConst(sharedKey, `p_${type}`, () => {
      return this.buildFormatterAst('PluralRules', type ? { type } : undefined);
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

    const { ast } = createComponent(localName, message, this);

    this.exports.set(componentName, { localName, ast });
  }

  _buildSharedConstAst(sharedConst: SharedConst): t.Statement {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(sharedConst.localName),
        sharedConst.init
      ),
    ]);
  }

  buildModuleAst() {
    const formatterDeclarations = Array.from(
      this._sharedConsts.values(),
      (sharedConst) => this._buildSharedConstAst(sharedConst)
    );
    const componentDeclarations: t.Statement[] = [];
    const exportSpecifiers: t.ExportSpecifier[] = [];
    const displayNames: t.Statement[] = [];
    for (const [componentName, { localName, ast }] of this.exports.entries()) {
      componentDeclarations.push(ast);
      exportSpecifiers.push(
        t.exportSpecifier(t.identifier(localName), t.identifier(componentName))
      );
      if (localName !== componentName) {
        displayNames.push(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(
                t.identifier(localName),
                t.identifier('displayName')
              ),
              t.stringLiteral(componentName)
            )
          )
        );
      }
    }
    return [
      ...(this.react
        ? [
            t.importDeclaration(
              [t.importNamespaceSpecifier(t.identifier('React'))],
              t.stringLiteral('react')
            ),
          ]
        : []),
      ...formatterDeclarations,
      ...componentDeclarations,
      ...displayNames,
      t.exportNamedDeclaration(null, exportSpecifiers),
    ];
  }
}
