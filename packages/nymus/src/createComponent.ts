import * as mf from 'intl-messageformat-parser';
import * as t from '@babel/types';
import Scope from './Scope';
import TransformationError from './TransformationError';
import Module from './Module';
import * as astUtil from './astUtil';
import { Formats } from './formats';
import { UnifiedNumberFormatOptions } from '@formatjs/intl-unified-numberformat';

type ToType<F> = {
  [K in keyof F]: F[K];
};

export type FormatOptions = ToType<
  UnifiedNumberFormatOptions | mf.ExtendedDateTimeFormatOptions
>;

interface LiteralFragment {
  type: 'literal';
  value: string;
  isJsx: false;
}

interface ExpressionFragment {
  type: 'dynamic';
  value: t.Expression;
  isJsx: boolean;
}

type TemplateFragment = LiteralFragment | ExpressionFragment;

function createLiteralFragment(value: string): LiteralFragment {
  return {
    type: 'literal',
    value,
    isJsx: false,
  };
}

function createExpressionFragment(
  value: t.Expression,
  isJsx: boolean
): ExpressionFragment {
  return {
    type: 'dynamic',
    value,
    isJsx,
  };
}

interface Argument {
  localName?: string;
  type: ArgumentType;
}

function icuNodesToExpression(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): t.Expression {
  const fragments = icuNodes.map((icuNode) =>
    icuNodeToJsFragment(icuNode, context)
  );

  const containsJsx = fragments.some((fragment) => fragment.isJsx);

  if (containsJsx) {
    if (context.target !== 'react') {
      throw new Error(
        "Invariant: a fragment shouldn't be jsx when a string template is generated"
      );
    }
    return t.jsxFragment(
      t.jsxOpeningFragment(),
      t.jsxClosingFragment(),
      fragments.map((fragment) => {
        switch (fragment.type) {
          case 'literal':
            return t.jsxText(fragment.value);
          case 'dynamic':
            return t.jsxExpressionContainer(fragment.value);
        }
      })
    );
  } else {
    if (fragments.length <= 0) {
      return t.stringLiteral('');
    } else if (fragments.length === 1 && fragments[0].type === 'literal') {
      return t.stringLiteral(fragments[0].value);
    }
    return astUtil.buildBinaryChain(
      '+',
      t.stringLiteral(''),
      ...fragments.map((fragment) => {
        switch (fragment.type) {
          case 'literal':
            return t.stringLiteral(fragment.value);
          case 'dynamic':
            return fragment.value;
        }
      })
    );
  }
}

function buildFormatterCall(formatter: t.Identifier, value: t.Identifier) {
  return t.callExpression(
    t.memberExpression(formatter, t.identifier('format')),
    [value]
  );
}

function buildPluralRulesCall(formatter: t.Identifier, value: t.Identifier) {
  return t.callExpression(
    t.memberExpression(formatter, t.identifier('select')),
    [value]
  );
}

function icuLiteralElementToFragment(
  elm: mf.LiteralElement,
  context: ComponentContext
) {
  return createLiteralFragment(elm.value);
}

function icuArgumentElementToFragment(
  elm: mf.ArgumentElement,
  context: ComponentContext
) {
  const localIdentifier = context.addArgument(elm.value, ArgumentType.Text);
  return createExpressionFragment(localIdentifier, context.target === 'react');
}

function icuSelectElementToFragment(
  elm: mf.SelectElement,
  context: ComponentContext
) {
  const argIdentifier = context.addArgument(elm.value, ArgumentType.string);
  if (!elm.options.hasOwnProperty('other')) {
    throw new TransformationError(
      'A select element requires an "other"',
      elm.location || null
    );
  }
  const { other, ...options } = elm.options;
  const cases = Object.entries(options).map(([name, caseNode]) => ({
    test: t.binaryExpression('===', argIdentifier, t.stringLiteral(name)),
    consequent: icuNodesToExpression(caseNode.value, context),
  }));
  const otherFragment = icuNodesToExpression(other.value, context);
  return createExpressionFragment(
    astUtil.buildTernaryChain(cases, otherFragment),
    false
  );
}

function icuPluralElementToFragment(
  elm: mf.PluralElement,
  context: ComponentContext
) {
  const argIdentifier = context.addArgument(elm.value, ArgumentType.number);
  const formatted = context.useFormattedValue(
    argIdentifier,
    'number',
    'decimal'
  );
  context.enterPlural(formatted);
  if (!elm.options.hasOwnProperty('other')) {
    throw new TransformationError(
      'A plural element requires an "other"',
      elm.location || null
    );
  }
  const { other, ...options } = elm.options;
  const otherFragment = icuNodesToExpression(other.value, context);
  const withOffset = context.useWithOffset(argIdentifier, elm.offset);
  const localized = context.useLocalizedMatcher(withOffset, elm.pluralType);
  const cases = Object.entries(options).map(([name, caseNode]) => {
    const test = name.startsWith('=')
      ? t.binaryExpression(
          '===',
          withOffset,
          t.numericLiteral(Number(name.slice(1)))
        )
      : t.binaryExpression('===', localized, t.stringLiteral(name));
    return { test, consequent: icuNodesToExpression(caseNode.value, context) };
  });
  context.exitPlural();
  return createExpressionFragment(
    astUtil.buildTernaryChain(cases, otherFragment),
    false
  );
}

function icuNumberElementToFragment(
  elm: mf.NumberElement,
  context: ComponentContext
) {
  const value = context.addArgument(elm.value, ArgumentType.number);
  const style = mf.isNumberSkeleton(elm.style)
    ? mf.convertNumberSkeletonToNumberFormatOptions(elm.style.tokens)
    : elm.style || 'decimal';
  return createExpressionFragment(
    context.useFormattedValue(value, 'number', style),
    false
  );
}

function icuDateElementToFragment(
  elm: mf.DateElement,
  context: ComponentContext
) {
  const value = context.addArgument(elm.value, ArgumentType.Date);
  const style = mf.isDateTimeSkeleton(elm.style)
    ? mf.parseDateTimeSkeleton(elm.style.pattern)
    : elm.style || 'medium';
  return createExpressionFragment(
    context.useFormattedValue(value, 'date', style),
    false
  );
}

function icuTimeElementToFragment(
  elm: mf.TimeElement,
  context: ComponentContext
) {
  const value = context.addArgument(elm.value, ArgumentType.Date);
  const style = mf.isDateTimeSkeleton(elm.style)
    ? mf.parseDateTimeSkeleton(elm.style.pattern)
    : elm.style || 'medium';
  return createExpressionFragment(
    context.useFormattedValue(value, 'time', style),
    false
  );
}

function icuPoundElementToFragment(
  elm: mf.PoundElement,
  context: ComponentContext
) {
  return createExpressionFragment(context.getPound(), false);
}

function tagElementToFragment(elm: mf.TagElement, context: ComponentContext) {
  if (!t.isValidIdentifier(elm.value)) {
    throw new TransformationError(
      `"${elm.value}" is not a valid identifier`,
      elm.location || null
    );
  }
  const localName = context.addArgument(elm.value, ArgumentType.Markup);
  if (context.target === 'react') {
    const ast = t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier(localName.name), [], false),
      t.jsxClosingElement(t.jsxIdentifier(localName.name)),
      [t.jsxExpressionContainer(icuNodesToExpression(elm.children, context))],
      false
    );
    return createExpressionFragment(ast, true);
  } else {
    return createExpressionFragment(
      t.callExpression(localName, [
        icuNodesToExpression(elm.children, context),
      ]),
      false
    );
  }
}

function icuNodeToJsFragment(
  icuNode: mf.MessageFormatElement,
  context: ComponentContext
): TemplateFragment {
  switch (icuNode.type) {
    case mf.TYPE.literal:
      return icuLiteralElementToFragment(icuNode, context);
    case mf.TYPE.argument:
      return icuArgumentElementToFragment(icuNode, context);
    case mf.TYPE.select:
      return icuSelectElementToFragment(icuNode, context);
    case mf.TYPE.plural:
      return icuPluralElementToFragment(icuNode, context);
    case mf.TYPE.number:
      return icuNumberElementToFragment(icuNode, context);
    case mf.TYPE.date:
      return icuDateElementToFragment(icuNode, context);
    case mf.TYPE.time:
      return icuTimeElementToFragment(icuNode, context);
    case mf.TYPE.pound:
      return icuPoundElementToFragment(icuNode, context);
    case mf.TYPE.tag:
      return tagElementToFragment(icuNode, context);
    default:
      throw new Error(
        `Unknown AST node type ${(icuNode as mf.MessageFormatElement).type}`
      );
  }
}

function createContext(module: Module): ComponentContext {
  return new ComponentContext(module);
}

enum ArgumentType {
  string,
  number,
  Date,
  Markup,
  Text,
}

function getTypeAnnotation(type: ArgumentType, context: ComponentContext) {
  switch (type) {
    case ArgumentType.string:
      return t.tsStringKeyword();
    case ArgumentType.number:
      return t.tsNumberKeyword();
    case ArgumentType.Date:
      return t.tsTypeReference(t.identifier('Date'));
    case ArgumentType.Text:
      if (context.target === 'react') {
        return t.tsTypeReference(
          t.tsQualifiedName(t.identifier('React'), t.identifier('ReactNode'))
        );
      } else {
        return t.tsStringKeyword();
      }
    case ArgumentType.Markup:
      if (context.target === 'react') {
        return t.tsTypeReference(
          t.tsQualifiedName(t.identifier('React'), t.identifier('Element'))
        );
      } else {
        const childrenParam = t.identifier('children');
        childrenParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
        return t.tsFunctionType(
          null,
          [childrenParam],
          t.tsTypeAnnotation(t.tsStringKeyword())
        );
      }
  }
}

interface SharedConst {
  localName: string;
  init: t.Expression;
}

class ComponentContext {
  _module: Module;
  args: Map<string, Argument>;
  _scope: Scope;
  _poundStack: t.Identifier[];
  _sharedConsts: Map<string, SharedConst>;

  constructor(module: Module) {
    this._module = module;
    this._scope = new Scope(module.scope);
    this.args = new Map();
    this._poundStack = [];
    this._sharedConsts = new Map();
  }

  enterPlural(identifier: t.Identifier) {
    this._poundStack.unshift(identifier);
  }

  exitPlural() {
    this._poundStack.shift();
  }

  getPound() {
    return this._poundStack[0];
  }

  get locale() {
    return this._module.locale;
  }

  get formats() {
    return this._module.formats;
  }

  get target() {
    return this._module.target;
  }

  addArgument(name: string, type: ArgumentType): t.Identifier {
    const arg: Argument = { type };
    if (this._scope.hasBinding(name)) {
      arg.localName = this._scope.createUniqueBinding(name);
    }
    this.args.set(name, arg);
    return t.identifier(arg.localName || name);
  }

  useFormatter(
    type: keyof Formats,
    style: string | FormatOptions
  ): t.Identifier {
    return this._module.useFormatter(type, style);
  }

  useFormattedValue(
    value: t.Identifier,
    type: keyof Formats,
    style: string | FormatOptions
  ): t.Identifier {
    const formatterId = this.useFormatter(type, style);
    const key = JSON.stringify(['formattedValue', value.name, type, style]);
    return this._useSharedConst(key, value.name, () =>
      buildFormatterCall(formatterId, value)
    );
  }

  useWithOffset(value: t.Identifier, offset: number = 0): t.Identifier {
    if (offset === 0) {
      return value;
    }
    const key = JSON.stringify(['withOffset', value.name, offset]);
    return this._useSharedConst(key, `${value.name}_offset_${offset}`, () =>
      t.binaryExpression('-', value, t.numericLiteral(offset))
    );
  }

  useLocalizedMatcher(
    value: t.Identifier,
    pluralType: 'ordinal' | 'cardinal' = 'cardinal'
  ): t.Identifier {
    const key = JSON.stringify(['localizedMatcher', value.name, pluralType]);
    const pluralRules = this.usePlural(pluralType);

    return this._useSharedConst(key, `${value.name}_loc`, () =>
      buildPluralRulesCall(pluralRules, value)
    );
  }

  usePlural(type: 'ordinal' | 'cardinal' = 'cardinal'): t.Identifier {
    return this._module.usePlural(type);
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

    const localName = this._scope.createUniqueBinding(name);
    this._sharedConsts.set(key, { localName, init: build() });
    return t.identifier(localName);
  }

  buildArgsAst() {
    if (this.args.size <= 0) {
      return [];
    } else {
      const argsObjectPattern = t.objectPattern(
        Array.from(this.args.entries(), ([name, arg]) => {
          const key = t.identifier(name);
          const value = arg.localName ? t.identifier(arg.localName) : key;
          return t.objectProperty(key, value, false, !arg.localName);
        })
      );
      argsObjectPattern.typeAnnotation = t.tsTypeAnnotation(
        t.tsTypeLiteral(
          Array.from(this.args.entries(), ([name, arg]) => {
            return t.tsPropertySignature(
              t.identifier(name),
              t.tsTypeAnnotation(getTypeAnnotation(arg.type, this))
            );
          })
        )
      );
      return [argsObjectPattern];
    }
  }

  _buildSharedConstAst(sharedConst: SharedConst): t.Statement {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(sharedConst.localName),
        sharedConst.init
      ),
    ]);
  }

  buildSharedConstsAst(): t.Statement[] {
    return Array.from(this._sharedConsts.values(), (sharedConst) =>
      this._buildSharedConstAst(sharedConst)
    );
  }
}

export default function icuToReactComponent(
  componentName: string,
  icuStr: string,
  module: Module
) {
  const context = createContext(module);
  const icuAst = mf.parse(icuStr, {
    captureLocation: true,
  });
  const returnValue = icuNodesToExpression(icuAst, context);
  const ast = t.functionDeclaration(
    t.identifier(componentName),
    context.buildArgsAst(),
    t.blockStatement([
      ...context.buildSharedConstsAst(),
      t.returnStatement(returnValue),
    ])
  );

  return {
    ast,
    args: context.args,
  };
}
