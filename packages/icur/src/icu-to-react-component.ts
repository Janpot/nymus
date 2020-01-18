import * as mf from 'intl-messageformat-parser';
import template from '@babel/template';
import * as t from '@babel/types';
import * as babylon from '@babel/parser';
import Scope from './scope';
import IcurError from './IcurError';
import Module from './Module';

interface Argument {
  localName?: string;
}

type IcuNode = mf.MessageFormatElement | mf.MessageFormatElement[];

function switchExpression(
  discriminant: t.Expression,
  cases: [string, t.Expression][],
  alternate: t.Expression
): t.Expression {
  if (cases.length <= 0) {
    return alternate;
  }
  const [[test, consequent], ...restCases] = cases;
  return t.conditionalExpression(
    t.binaryExpression('===', discriminant, t.stringLiteral(test)),
    consequent,
    switchExpression(discriminant, restCases, alternate)
  );
}

type JSXFragmentChild =
  | t.JSXFragment
  | t.JSXText
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXElement;

function interpolateJsxFragment(
  jsxFragment: t.JSXFragment,
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): t.JSXFragment {
  const fragment = interpolateJsxFragmentChildren(
    jsxFragment.children,
    icuNodes,
    context,
    0
  );
  return t.jsxFragment(
    t.jsxOpeningFragment(),
    t.jsxClosingFragment(),
    fragment
  );
}

function interpolateJsxFragmentChildren(
  jsx: JSXFragmentChild[],
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext,
  icuIndex: number
): JSXFragmentChild[] {
  const ast: JSXFragmentChild[] = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      const fragment = interpolateJsxFragment(child, icuNodes, context);
      ast.push(fragment);
    } else if (t.isJSXExpressionContainer(child)) {
      const icuNode = icuNodes[icuIndex];
      icuIndex++;
      const fragment = icuNodesToJsExpression(icuNode, context);
      ast.push(t.jsxExpressionContainer(fragment));
    } else if (t.isJSXElement(child)) {
      const identifier = child.openingElement.name;
      if (!t.isJSXIdentifier(identifier)) {
        throw new IcurError(
          'Invalid JSX element',
          child.openingElement.name.loc
        );
      }
      if (child.openingElement.attributes.length > 0) {
        throw new IcurError(
          'JSX attributes are not allowed',
          child.openingElement.attributes[0].loc
        );
      }

      const localName = context.addArgument(identifier.name);
      const fragment = interpolateJsxFragmentChildren(
        child.children,
        icuNodes,
        context,
        icuIndex
      );

      const interpolatedChild = t.jsxElement(
        t.jsxOpeningElement(
          t.jsxIdentifier(localName.name),
          [],
          child.openingElement.selfClosing
        ),
        t.jsxClosingElement(t.jsxIdentifier(localName.name)),
        fragment,
        child.selfClosing
      );

      ast.push(interpolatedChild);
    } else {
      ast.push(child);
    }
  }

  return ast;
}

function icuNodesToJsxExpression(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): t.Expression {
  if (icuNodes.length <= 0) {
    return t.nullLiteral();
  }

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
          ? icuNode.location!.end.column
          : icuNode.location!.end.column - icuNode.location!.start.column;
      return `{${'_' + '\n'.repeat(lines) + ' '.repeat(columns)}}`;
    })
    .join('');

  // Wrap in a root element to turn it into valid JSX
  const jsxElement = `<>${jsxContent}</>`;
  const jsxAst = babylon.parseExpression(jsxElement, {
    plugins: ['jsx']
  }) as t.JSXFragment;

  const interpollatedIcuNodes = icuNodes.filter(
    node => !mf.isLiteralElement(node)
  );

  return interpolateJsxFragment(jsxAst, interpollatedIcuNodes, context);
}

const buildFormatterCall = template.expression(`
  %%formatter%%.format(%%value%%)
`);

const buildPluralRulesCall = template.expression(`
  %%formatter%%.select(%%value%%)
`);

function icuNodesToJsExpression(
  icuNode: IcuNode,
  context: ComponentContext
): t.Expression {
  if (Array.isArray(icuNode)) {
    return icuNodesToJsxExpression(icuNode, context);
  } else if (mf.isLiteralElement(icuNode)) {
    return t.stringLiteral(icuNode.value);
  } else if (mf.isArgumentElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return argIdentifier;
  } else if (mf.isSelectElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new IcurError(
        'A select element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const cases = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsExpression(caseNode.value, context)];
    }) as [string, t.Expression][];
    const otherFragment = icuNodesToJsExpression(other.value, context);
    return switchExpression(argIdentifier, cases, otherFragment);
  } else if (mf.isPluralElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    const formatter = context.useFormatter('number', 'decimal');
    const formatted = context.addLocal(
      'formatted',
      buildFormatterCall({ formatter, value: argIdentifier })
    );
    context.enterPlural(formatted);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new IcurError(
        'A plural element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const cases = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsExpression(caseNode.value, context)];
    }) as [string, t.Expression][];
    const otherFragment = icuNodesToJsExpression(other.value, context);
    const pluralRules = context.usePlural(icuNode.pluralType);
    const withOffset = context.addLocal(
      'withOffset',
      t.binaryExpression('-', argIdentifier, t.numericLiteral(icuNode.offset))
    );
    const exact = context.addLocal(
      'exact',
      t.binaryExpression('+', t.stringLiteral('='), withOffset)
    );
    const localized = context.addLocal(
      'localized',
      buildPluralRulesCall({
        formatter: pluralRules,
        value: withOffset
      })
    );
    const ast = switchExpression(
      exact,
      cases,
      switchExpression(localized, cases, otherFragment)
    );
    context.exitPlural();
    return ast;
  } else if (mf.isNumberElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.useFormatter('number', icuNode.style as string);
    return buildFormatterCall({ formatter, value });
  } else if (mf.isDateElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.useFormatter('date', icuNode.style as string);
    return buildFormatterCall({ formatter, value });
  } else if (mf.isTimeElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.useFormatter('time', icuNode.style as string);
    return buildFormatterCall({ formatter, value });
  } else if (mf.isPoundElement(icuNode)) {
    return context.getPound();
  } else {
    throw new Error(`Unknown AST node type`);
  }
}

interface FormatterStyles {
  [style: string]: {
    [key: string]: string;
  };
}

export interface Formats {
  number: FormatterStyles;
  date: FormatterStyles;
  time: FormatterStyles;
}

function createContext(module: Module): ComponentContext {
  return new ComponentContext(module);
}

class ComponentContext {
  _module: Module;
  args: Map<string, Argument>;
  _localConsts: Map<string, t.Expression>;
  _scope: Scope;
  _poundStack: t.Identifier[];

  constructor(module: Module) {
    this._module = module;
    this._scope = new Scope(module.scope);
    this.args = new Map();
    this._localConsts = new Map();
    this._poundStack = [];
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

  addArgument(name: string): t.Identifier {
    const arg: Argument = {};
    if (this._scope.hasBinding(name)) {
      arg.localName = this._scope.createUniqueBinding(name);
    }
    this.args.set(name, arg);
    return t.identifier(arg.localName || name);
  }

  useFormatter(type: keyof Formats, style: string): t.Identifier {
    return this._module.useFormatter(type, style);
  }

  usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier {
    return this._module.usePlural(type);
  }

  getLocaleAsAst() {
    return this._module.getLocaleAsAst();
  }

  addLocal(name: string, init: t.Expression): t.Identifier {
    const localName = this._scope.createUniqueBinding(name);
    this._localConsts.set(localName, init);
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
        t.tsTypeLiteral([])
      );
      return [argsObjectPattern];
    }
  }

  buildConstsAst(): t.Statement[] {
    return Array.from(this._localConsts.entries(), ([name, init]) => {
      return t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(name), init)
      ]);
    });
  }
}

export default function icuToReactComponent(
  componentName: string,
  icuStr: string,
  module: Module
) {
  const context = createContext(module);
  const icuAst = mf.parse(icuStr, {
    captureLocation: true
  });
  const returnValue = icuNodesToJsExpression(icuAst, context);
  const ast = t.functionExpression(
    t.identifier(componentName),
    context.buildArgsAst(),
    t.blockStatement([
      ...context.buildConstsAst(),
      t.returnStatement(returnValue)
    ])
  );

  return {
    ast,
    args: context.args
  };
}
