import * as mf from 'intl-messageformat-parser';
import * as t from '@babel/types';
import * as babylon from '@babel/parser';
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

type JSXFragmentChild =
  | t.JSXFragment
  | t.JSXText
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXElement;

function interpolateJsxFragmentChildren(
  jsx: JSXFragmentChild[],
  fragments: Fragment[],
  context: ComponentContext,
  index: number
): Fragment[] {
  const result = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      throw new TransformationError(
        'Fragments are not allowed',
        rewriteLocation(child.loc)
      );
    } else if (t.isJSXExpressionContainer(child)) {
      const fragment = fragments[index];
      index++;
      result.push(fragment);
    } else if (t.isJSXElement(child)) {
      const identifier = child.openingElement.name;
      if (!t.isJSXIdentifier(identifier)) {
        throw new TransformationError(
          'Invalid JSX element',
          rewriteLocation(child.openingElement.name.loc)
        );
      }
      if (child.openingElement.attributes.length > 0) {
        throw new TransformationError(
          'JSX attributes are not allowed',
          rewriteLocation(child.openingElement.attributes[0].loc)
        );
      }

      const localName = context.addArgument(identifier.name, 'React.Element');
      const fragment = interpolateJsxFragmentChildren(
        child.children,
        fragments,
        context,
        index
      );

      const interpolatedChild = astUtil.buildReactElement(
        localName,
        fragment.map((frag) => frag.ast)
      );

      result.push({ elm: true, ast: interpolatedChild });
    } else if (t.isJSXText(child)) {
      result.push({ elm: false, ast: t.stringLiteral(child.value) });
    }
  }

  return result;
}

function rewriteLocation(
  loc: t.SourceLocation | null
): t.SourceLocation | null {
  if (!loc) {
    return null;
  }
  return {
    start: {
      line: loc.start.line,
      column: loc.start.line === 1 ? loc.start.column - 1 : loc.start.column,
    },
    end: {
      line: loc.end.line,
      column: loc.end.line === 1 ? loc.end.column - 1 : loc.end.column,
    },
  };
}

function icuNodesToJsFragments(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): Fragment[] {
  if (icuNodes.length <= 0) {
    return [];
  } else if (context.react) {
    const jsxContent = icuNodes
      .map((icuNode, i) => {
        if (mf.isLiteralElement(icuNode)) {
          return icuNode.value;
        }
        // replace anything that is not a literal with an expression container placeholder
        // of the same length to preserve location
        const lines = icuNode.location!.end.line - icuNode.location!.start.line;
        const columns =
          lines > 0
            ? icuNode.location!.end.column - 2
            : icuNode.location!.end.column - icuNode.location!.start.column - 3;
        return `{${
          '_' + '\n'.repeat(lines) + ' '.repeat(Math.max(columns, 0))
        }}`;
      })
      .join('');

    // Wrap in a root element to turn it into valid JSX
    const jsxElement = `<>${jsxContent}</>`;
    const jsxAst = babylon.parseExpression(jsxElement, {
      plugins: ['jsx'],
    }) as t.JSXFragment;

    const interpollatedIcuNodes = icuNodes.filter(
      (node) => !mf.isLiteralElement(node)
    );

    const fragments = interpollatedIcuNodes.map((icuNode) =>
      icuNodeToJsFragment(icuNode, context)
    );

    return interpolateJsxFragmentChildren(
      jsxAst.children,
      fragments,
      context,
      0
    );
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
  const argIdentifier = context.addArgument(elm.value, 'string');
  return { elm: false, ast: argIdentifier };
}

function icuSelectElementToJsFragment(
  elm: mf.SelectElement,
  context: ComponentContext
): Fragment {
  const argIdentifier = context.addArgument(elm.value, 'string');
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
  const argIdentifier = context.addArgument(elm.value, 'number');
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
  const value = context.addArgument(elm.value, 'number');
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
  const value = context.addArgument(elm.value, 'Date');
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
  const value = context.addArgument(elm.value, 'Date');
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
    default:
      throw new Error(`Unknown AST node type ${icuNode.type}`);
  }
}

function createContext(module: Module): ComponentContext {
  return new ComponentContext(module);
}

type ArgumentType = 'string' | 'number' | 'Date' | 'React.Element';

function getTypeAnnotation(type: ArgumentType) {
  switch (type) {
    case 'string':
      return t.tsStringKeyword();
    case 'number':
      return t.tsNumberKeyword();
    case 'Date':
      return t.tsTypeReference(t.identifier('Date'));
    case 'React.Element':
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
