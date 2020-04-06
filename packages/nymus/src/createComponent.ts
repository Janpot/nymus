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

interface Fragment {
  // Flag to indicate whether this fragment contains parts that can be React Elements
  elm: boolean;
  // AST representation of the fragment
  ast: t.Expression;
}

interface Argument {
  localName?: string;
  type: ArgumentType;
}

function icuNodesToJsFragments(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): Fragment[] {
  if (icuNodes.length <= 0) {
    return [];
  } else {
    return icuNodes.map((icuNode) => icuNodeToJsFragment(icuNode, context));
  }
}

function flattenFragments(fragments: Fragment[]): Fragment {
  if (fragments.length <= 0) {
    return { elm: false, ast: t.stringLiteral('') };
  } else if (fragments.length === 1) {
    return fragments[0];
  } else {
    const elm = fragments.some((frag) => frag.elm);
    if (elm) {
      return {
        elm,
        ast: astUtil.buildReactElement(
          t.memberExpression(t.identifier('React'), t.identifier('Fragment')),
          fragments.map((frag) => frag.ast)
        ),
      };
    } else {
      const operands = fragments.map((fragment) => fragment.ast);
      if (!t.isStringLiteral(operands[0])) {
        operands.unshift(t.stringLiteral(''));
      }
      return {
        elm,
        ast: astUtil.buildBinaryChain('+', ...operands),
      };
    }
  }
}

function icuNodesToJsFragment(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): Fragment {
  const fragments = icuNodesToJsFragments(icuNodes, context);
  return flattenFragments(fragments);
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

function icuLiteralElementToJsFragment(
  elm: mf.LiteralElement,
  context: ComponentContext
): Fragment {
  return { elm: false, ast: t.stringLiteral(elm.value) };
}

function icuArgumentElementToJsFragment(
  elm: mf.ArgumentElement,
  context: ComponentContext
): Fragment {
  const argIdentifier = context.addArgument(elm.value, ArgumentType.ReactNode);
  return { elm: true, ast: argIdentifier };
}

function icuSelectElementToJsFragment(
  elm: mf.SelectElement,
  context: ComponentContext
): Fragment {
  const argIdentifier = context.addArgument(elm.value, ArgumentType.string);
  if (!elm.options.hasOwnProperty('other')) {
    throw new TransformationError(
      'A select element requires an "other"',
      elm.location || null
    );
  }
  const { other, ...options } = elm.options;
  const caseFragments = Object.entries(options).map(([name, caseNode]) => {
    return [name, icuNodesToJsFragment(caseNode.value, context)];
  }) as [string, Fragment][];
  const cases = caseFragments.map(([name, fragment]) => {
    return [
      t.binaryExpression('===', argIdentifier, t.stringLiteral(name)),
      fragment.ast,
    ];
  }) as [t.Expression, t.Expression][];
  const otherFragment = icuNodesToJsFragment(other.value, context);
  return {
    elm:
      caseFragments.some(([, fragment]) => fragment.elm) || otherFragment.elm,
    ast: astUtil.buildTernaryChain(cases, otherFragment.ast),
  };
}

function icuPluralElementToJsFragment(
  elm: mf.PluralElement,
  context: ComponentContext
): Fragment {
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
  const otherFragment = icuNodesToJsFragment(other.value, context);
  const withOffset = context.useWithOffset(argIdentifier, elm.offset);
  const localized = context.useLocalizedMatcher(withOffset, elm.pluralType);
  const caseFragments = Object.entries(options).map(([name, caseNode]) => {
    return [name, icuNodesToJsFragment(caseNode.value, context)];
  }) as [string, Fragment][];
  const cases = caseFragments.map(([name, fragment]) => {
    const test = name.startsWith('=')
      ? t.binaryExpression(
          '===',
          withOffset,
          t.numericLiteral(Number(name.slice(1)))
        )
      : t.binaryExpression('===', localized, t.stringLiteral(name));
    return [test, fragment.ast];
  }) as [t.Expression, t.Expression][];
  const ast = astUtil.buildTernaryChain(cases, otherFragment.ast);
  context.exitPlural();
  return {
    elm:
      caseFragments.some(([, fragment]) => fragment.elm) || otherFragment.elm,
    ast,
  };
}

function icuNumberElementToJsFragment(
  elm: mf.NumberElement,
  context: ComponentContext
): Fragment {
  const value = context.addArgument(elm.value, ArgumentType.number);
  const style = mf.isNumberSkeleton(elm.style)
    ? mf.convertNumberSkeletonToNumberFormatOptions(elm.style.tokens)
    : elm.style || 'decimal';
  const formattedValue = context.useFormattedValue(value, 'number', style);
  return { elm: false, ast: formattedValue };
}

function icuDateElementToJsFragment(
  elm: mf.DateElement,
  context: ComponentContext
): Fragment {
  const value = context.addArgument(elm.value, ArgumentType.Date);
  const style = mf.isDateTimeSkeleton(elm.style)
    ? mf.parseDateTimeSkeleton(elm.style.pattern)
    : elm.style || 'medium';
  const formattedValue = context.useFormattedValue(value, 'date', style);
  return { elm: false, ast: formattedValue };
}

function icuTimeElementToJsFragment(
  elm: mf.TimeElement,
  context: ComponentContext
): Fragment {
  const value = context.addArgument(elm.value, ArgumentType.Date);
  const style = mf.isDateTimeSkeleton(elm.style)
    ? mf.parseDateTimeSkeleton(elm.style.pattern)
    : elm.style || 'medium';
  const formattedValue = context.useFormattedValue(value, 'time', style);
  return { elm: false, ast: formattedValue };
}

function icuPoundElementToJsFragment(
  elm: mf.PoundElement,
  context: ComponentContext
): Fragment {
  return { elm: false, ast: context.getPound() };
}

function tagElementToJsFragment(
  elm: mf.TagElement,
  context: ComponentContext
): Fragment {
  if (context.react) {
    if (!t.isValidIdentifier(elm.value)) {
      throw new TransformationError(
        `"${elm.value}" is not a valid identifier`,
        elm.location || null
      );
    }
    const localName = context.addArgument(elm.value, ArgumentType.ReactElement);
    const ast = astUtil.buildReactElement(localName, [
      icuNodesToJsFragment(elm.children, context).ast,
    ]);
    return { elm: true, ast };
  } else {
    return {
      elm: false,
      ast: astUtil.buildBinaryChain(
        '+',
        t.stringLiteral(`<${elm.value}>`),
        icuNodesToJsFragment(elm.children, context).ast,
        t.stringLiteral(`</${elm.value}>`)
      ),
    };
  }
}

function icuNodeToJsFragment(
  icuNode: mf.MessageFormatElement,
  context: ComponentContext
): Fragment {
  switch (icuNode.type) {
    case mf.TYPE.literal:
      return icuLiteralElementToJsFragment(icuNode, context);
    case mf.TYPE.argument:
      return icuArgumentElementToJsFragment(icuNode, context);
    case mf.TYPE.select:
      return icuSelectElementToJsFragment(icuNode, context);
    case mf.TYPE.plural:
      return icuPluralElementToJsFragment(icuNode, context);
    case mf.TYPE.number:
      return icuNumberElementToJsFragment(icuNode, context);
    case mf.TYPE.date:
      return icuDateElementToJsFragment(icuNode, context);
    case mf.TYPE.time:
      return icuTimeElementToJsFragment(icuNode, context);
    case mf.TYPE.pound:
      return icuPoundElementToJsFragment(icuNode, context);
    case mf.TYPE.tag:
      return tagElementToJsFragment(icuNode, context);
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
  ReactElement,
  ReactNode,
}

function getTypeAnnotation(type: ArgumentType) {
  switch (type) {
    case ArgumentType.string:
      return t.tsStringKeyword();
    case ArgumentType.number:
      return t.tsNumberKeyword();
    case ArgumentType.Date:
      return t.tsTypeReference(t.identifier('Date'));
    case ArgumentType.ReactNode:
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier('React'), t.identifier('ReactNode'))
      );
    case ArgumentType.ReactElement:
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier('React'), t.identifier('Element'))
      );
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

  get react() {
    return this._module.react;
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
              t.tsTypeAnnotation(getTypeAnnotation(arg.type))
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
  const returnValue = icuNodesToJsFragment(icuAst, context);
  const ast = t.functionDeclaration(
    t.identifier(componentName),
    context.buildArgsAst(),
    t.blockStatement([
      ...context.buildSharedConstsAst(),
      t.returnStatement(returnValue.ast),
    ])
  );

  return {
    ast,
    args: context.args,
  };
}
