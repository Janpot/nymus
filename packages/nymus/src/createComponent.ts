import * as mf from 'intl-messageformat-parser';
import * as t from '@babel/types';
import * as babylon from '@babel/parser';
import Scope from './Scope';
import TransformationError from './TransformationError';
import Module from './Module';
import * as astUtil from './astUtil';
import { Formats } from './formats';

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

function interpolateJsxFragment(
  jsxFragment: t.JSXFragment,
  fragments: Fragment[],
  context: ComponentContext
): Fragment {
  const fragment = interpolateJsxFragmentChildren(
    jsxFragment.children,
    fragments,
    context,
    0
  );
  if (fragment.length <= 0) {
    return { elm: false, ast: t.nullLiteral() };
  } else if (fragment.length === 1) {
    return fragment[0];
  } else {
    const elm = fragment.some(frag => frag.elm);
    if (elm) {
      return {
        elm,
        ast: astUtil.buildReactElement(
          t.memberExpression(t.identifier('React'), t.identifier('Fragment')),
          fragment.map(frag => frag.ast)
        )
      };
    } else {
      const operands = fragment.map(fragment => fragment.ast);
      if (!t.isStringLiteral(operands[0])) {
        operands.unshift(t.stringLiteral(''));
      }
      return {
        elm,
        ast: astUtil.buildBinaryChain('+', ...operands)
      };
    }
  }
}

function interpolateJsxFragmentChildren(
  jsx: JSXFragmentChild[],
  fragments: Fragment[],
  context: ComponentContext,
  index: number
): Fragment[] {
  const result = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      throw new TransformationError('Fragments are not allowed', child.loc);
    } else if (t.isJSXExpressionContainer(child)) {
      const fragment = fragments[index];
      index++;
      result.push(fragment);
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
        fragments,
        context,
        index
      );

      const interpolatedChild = astUtil.buildReactElement(
        localName,
        fragment.map(frag => frag.ast)
      );

      result.push({ elm: true, ast: interpolatedChild });
    } else if (t.isJSXText(child)) {
      result.push({ elm: false, ast: t.stringLiteral(child.value) });
    }
  }

  return result;
}

function icuNodesToJsxExpression(
  icuNodes: mf.MessageFormatElement[],
  context: ComponentContext
): Fragment {
  if (icuNodes.length <= 0) {
    return { ast: t.nullLiteral(), elm: false };
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

  const fragments = interpollatedIcuNodes.map(icuNode =>
    icuNodesToJsExpression(icuNode, context)
  );

  return interpolateJsxFragment(jsxAst, fragments, context);
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
  icuNode: mf.MessageFormatElement,
  context: ComponentContext
): Fragment {
  if (mf.isLiteralElement(icuNode)) {
    return { elm: false, ast: t.stringLiteral(icuNode.value) };
  } else if (mf.isArgumentElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    return { elm: true, ast: argIdentifier };
  } else if (mf.isSelectElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new TransformationError(
        'A select element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const caseFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsxExpression(caseNode.value, context)];
    }) as [string, Fragment][];
    const cases = caseFragments.map(([name, fragment]) => {
      return [
        t.binaryExpression('===', argIdentifier, t.stringLiteral(name)),
        fragment.ast
      ];
    }) as [t.Expression, t.Expression][];
    const otherFragment = icuNodesToJsxExpression(other.value, context);
    return {
      elm:
        caseFragments.some(([, fragment]) => fragment.elm) || otherFragment.elm,
      ast: astUtil.buildTernaryChain(cases, otherFragment.ast)
    };
  } else if (mf.isPluralElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value, 'string');
    const formatted = context.useFormattedValue(
      argIdentifier,
      'number',
      'decimal'
    );
    context.enterPlural(formatted);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new TransformationError(
        'A plural element requires an "other"',
        icuNode.location || null
      );
    }
    const { other, ...options } = icuNode.options;
    const otherFragment = icuNodesToJsxExpression(other.value, context);
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
    const caseFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsxExpression(caseNode.value, context)];
    }) as [string, Fragment][];
    const cases = caseFragments.map(([name, fragment]) => {
      const test = name.startsWith('=')
        ? t.binaryExpression('===', exact, t.stringLiteral(name))
        : t.binaryExpression('===', localized, t.stringLiteral(name));
      return [test, fragment.ast];
    }) as [t.Expression, t.Expression][];
    const ast = astUtil.buildTernaryChain(cases, otherFragment.ast);
    context.exitPlural();
    return {
      elm:
        caseFragments.some(([, fragment]) => fragment.elm) || otherFragment.elm,
      ast
    };
  } else if (mf.isNumberElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'number');
    const formattedValue = context.useFormattedValue(
      value,
      'number',
      icuNode.style as string
    );
    return { elm: false, ast: formattedValue };
  } else if (mf.isDateElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'Date');
    const formattedValue = context.useFormattedValue(
      value,
      'date',
      icuNode.style as string
    );
    return { elm: false, ast: formattedValue };
  } else if (mf.isTimeElement(icuNode)) {
    const value = context.addArgument(icuNode.value, 'Date');
    const formattedValue = context.useFormattedValue(
      value,
      'time',
      icuNode.style as string
    );
    return { elm: false, ast: formattedValue };
  } else if (mf.isPoundElement(icuNode)) {
    return { elm: false, ast: context.getPound() };
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

interface SharedConst {
  localName: string;
  init: t.Expression;
}

class ComponentContext {
  _module: Module;
  args: Map<string, Argument>;
  _localConsts: Map<string, t.Expression>;
  _scope: Scope;
  _poundStack: t.Identifier[];
  _sharedConsts: Map<string, SharedConst>;

  constructor(module: Module) {
    this._module = module;
    this._scope = new Scope(module.scope);
    this.args = new Map();
    this._localConsts = new Map();
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

  useFormatter(type: keyof Formats, style: string): t.Identifier {
    return this._module.useFormatter(type, style);
  }

  useFormattedValue(
    value: t.Identifier,
    type: keyof Formats,
    style: string
  ): t.Identifier {
    const formatterId = this.useFormatter(type, style);
    const key = JSON.stringify(['formattedValue', value.name, type, style]);
    const formattedValue = this._useSharedConst(key, value.name, () =>
      buildFormatterCall(formatterId, value)
    );
    return formattedValue;
  }

  usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier {
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

  _buildSharedConstAst(sharedConst: SharedConst): t.Statement {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(sharedConst.localName),
        sharedConst.init
      )
    ]);
  }

  buildSharedConstsAst(): t.Statement[] {
    return Array.from(this._sharedConsts.values(), sharedConst =>
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
    captureLocation: true
  });
  const returnValue = icuNodesToJsxExpression(icuAst, context);
  const ast = t.functionExpression(
    t.identifier(componentName),
    context.buildArgsAst(),
    t.blockStatement([
      ...context.buildSharedConstsAst(),
      ...context.buildConstsAst(),
      t.returnStatement(returnValue.ast)
    ])
  );

  return {
    ast,
    args: context.args
  };
}
