import * as mf from 'intl-messageformat-parser';
import * as t from '@babel/types';
import * as babylon from '@babel/parser';
import Scope from './Scope';
import TransformationError from './TransformationError';
import Module from './Module';
import * as astUtil from './astUtil';
import { Formats } from './formats';

interface Argument {
  localName?: string;
  type: ArgumentType;
}

type IcuNode = mf.MessageFormatElement | mf.MessageFormatElement[];

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
): t.Expression {
  const fragment = interpolateJsxFragmentChildren(
    jsxFragment.children,
    icuNodes,
    context,
    0
  );
  if (fragment.length <= 0) {
    return t.nullLiteral();
  } else if (fragment.length === 1) {
    return fragment[0];
  } else {
    return astUtil.buildReactElement(
      t.memberExpression(t.identifier('React'), t.identifier('Fragment')),
      fragment
    );
  }
}

function interpolateJsxFragmentChildren(
  jsx: JSXFragmentChild[],
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext,
  icuIndex: number
): t.Expression[] {
  const ast: t.Expression[] = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      throw new TransformationError('Fragments are not allowed', child.loc);
    } else if (t.isJSXExpressionContainer(child)) {
      const icuNode = icuNodes[icuIndex];
      icuIndex++;
      const fragment = icuNodesToJsExpression(icuNode, context);
      ast.push(fragment);
    } else if (t.isJSXElement(child)) {
      const identifier = child.openingElement.name;
      if (!t.isJSXIdentifier(identifier)) {
        throw new TransformationError(
          'Invalid JSX element',
          child.openingElement.name.loc
        );
      }
      if (child.openingElement.attributes.length > 0) {
        throw new TransformationError(
          'JSX attributes are not allowed',
          child.openingElement.attributes[0].loc
        );
      }

      const localName = context.addArgument(identifier.name, 'React.Element');
      const fragment = interpolateJsxFragmentChildren(
        child.children,
        icuNodes,
        context,
        icuIndex
      );

      const interpolatedChild = astUtil.buildReactElement(localName, fragment);

      ast.push(interpolatedChild);
    } else if (t.isJSXText(child)) {
      ast.push(t.stringLiteral(child.value));
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

function icuNodesToJsExpression(
  icuNode: IcuNode,
  context: ComponentContext
): t.Expression {
  if (Array.isArray(icuNode)) {
    if (icuNode.length <= 0) {
      return t.stringLiteral('');
    } else if (icuNode.length === 1 && mf.isLiteralElement(icuNode[0])) {
      return t.stringLiteral(icuNode[0].value);
    } else {
      const rest = icuNode.slice(0, -1);
      const last = icuNode[icuNode.length - 1];
      return t.binaryExpression(
        '+',
        icuNodesToJsExpression(rest, context),
        icuNodesToJsExpression(last, context)
      );
    }
  } else if (mf.isLiteralElement(icuNode)) {
    return t.stringLiteral(icuNode.value);
  } else if (mf.isArgumentElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    return argIdentifier;
  } else if (mf.isSelectElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new TransformationError(
        'A select element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const cases = Object.entries(options).map(([name, caseNode]) => {
      return [
        t.binaryExpression('===', argIdentifier, t.stringLiteral(name)),
        icuNodesToJsExpression(caseNode.value, context)
      ];
    }) as [t.Expression, t.Expression][];
    const otherFragment = icuNodesToJsExpression(other.value, context);
    return astUtil.buildTernaryChain(cases, otherFragment);
  } else if (mf.isPluralElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    const formatter = context.useFormatter('number', 'decimal');
    const formatted = context.addLocal(
      `formatted_${icuNode.value}`,
      buildFormatterCall(formatter, argIdentifier)
    );
    context.enterPlural(formatted);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new TransformationError(
        'A plural element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const otherFragment = icuNodesToJsExpression(other.value, context);
    const pluralRules = context.usePlural(icuNode.pluralType);
    const withOffset =
      icuNode.offset !== 0
        ? context.addLocal(
            `offsetted_${icuNode.value}`,
            t.binaryExpression(
              '-',
              argIdentifier,
              t.numericLiteral(icuNode.offset)
            )
          )
        : argIdentifier;
    const exact = context.addLocal(
      `exact_${icuNode.value}_match`,
      t.binaryExpression('+', t.stringLiteral('='), withOffset)
    );
    const localized = context.addLocal(
      `localized_${icuNode.value}_match`,
      buildPluralRulesCall(pluralRules, withOffset)
    );
    const cases = Object.entries(options).map(([name, caseNode]) => {
      const test = name.startsWith('=')
        ? t.binaryExpression('===', exact, t.stringLiteral(name))
        : t.binaryExpression('===', localized, t.stringLiteral(name));
      return [test, icuNodesToJsExpression(caseNode.value, context)];
    }) as [t.Expression, t.Expression][];
    const ast = astUtil.buildTernaryChain(cases, otherFragment);
    context.exitPlural();
    return ast;
  } else if (mf.isNumberElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'number');
    const formatter = context.useFormatter('number', icuNode.style as string);
    return buildFormatterCall(formatter, value);
  } else if (mf.isDateElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'Date');
    const formatter = context.useFormatter('date', icuNode.style as string);
    return buildFormatterCall(formatter, value);
  } else if (mf.isTimeElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'Date');
    const formatter = context.useFormatter('time', icuNode.style as string);
    return buildFormatterCall(formatter, value);
  } else if (mf.isPoundElement(icuNode)) {
    return context.getPound();
  } else {
    throw new Error(`Unknown AST node type`);
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

  useFormatter(type: keyof Formats, style: string): t.Identifier {
    return this._module.useFormatter(type, style);
  }

  usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier {
    return this._module.usePlural(type);
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
  const returnValue = module.react
    ? icuNodesToJsxExpression(icuAst, context)
    : icuNodesToJsExpression(icuAst, context);
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
