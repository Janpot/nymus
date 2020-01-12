import * as mf from 'intl-messageformat-parser';
import { IntlMessageFormat } from 'intl-messageformat';
import template from "@babel/template";
import * as t from '@babel/types';
import * as babylon from '@babel/parser';

interface Argument {

}

type IcuNode = mf.MessageFormatElement | mf.MessageFormatElement[]

function switchExpression (discriminant: t.Expression, cases: [string, t.Expression][], alternate: t.Expression): t.Expression {
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

type JSXFragmentChild = (t.JSXFragment | t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement)

function interpolateJsxFragment (jsxFragment: t.JSXFragment, icuNodes: mf.MessageFormatElement[], context: ComponentContext): t.JSXFragment {
  const fragment = interpolateJsxFragmentChildren(jsxFragment.children, icuNodes, context);
  return t.jsxFragment(
    t.jsxOpeningFragment(),
    t.jsxClosingFragment(),
    fragment
  )
}

function interpolateJsxFragmentChildren (jsx: JSXFragmentChild[], icuNodes: mf.MessageFormatElement[], context: ComponentContext): JSXFragmentChild[] {
  const ast: JSXFragmentChild[] = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      const fragment = interpolateJsxFragment(child, icuNodes, context);
      ast.push(fragment);
    } else if (t.isJSXExpressionContainer(child)) {
      const { expression } = child
      if (!t.isNumericLiteral(expression)) {
        throw new Error('invalid AST');
      }
      const index = expression.value;
      const icuNode = icuNodes[index];
      const fragment = icuNodesToJsExpression(icuNode, context);
      ast.push(t.jsxExpressionContainer(fragment));
    } else if (t.isJSXElement(child)) {
      const identifier = child.openingElement.name;
      if (!t.isJSXIdentifier(identifier)) {
        throw new Error('Invalid JSX element')
      }

      context.addArgument(identifier.name);

      const fragment = interpolateJsxFragmentChildren(child.children, icuNodes, context)

      const interpolatedChild = t.jsxElement(
        child.openingElement,
        child.closingElement,
        fragment,
        child.selfClosing
      )
      ast.push(interpolatedChild)
    } else {
      ast.push(child)
    }
  }

  return ast
}

function icuNodesToJsxExpression (icuNodes: mf.MessageFormatElement[], context: ComponentContext): t.Expression {
  if (icuNodes.length <= 0) {
    return t.nullLiteral();
  }

  const jsxContent = icuNodes.map((icuNode, i) => {
    // replace anything that is not a literal with an expression container placeholder
    return mf.isLiteralElement(icuNode) ? icuNode.value : `{${i}}`;
  }).join('');

  // Wrap in a root element to turn it into valid JSX
  const jsxElement = `<>${jsxContent}</>`;
  const jsxAst = babylon.parseExpression(jsxElement, {
    plugins: ['jsx']
  }) as t.JSXFragment;

  return interpolateJsxFragment(jsxAst, icuNodes, context);
}

const buildNumberFormatter = template.expression(`
  React.useMemo(() => new Intl.NumberFormat(%%locale%%, %%options%%), [])
`)

const buildDateTimeFormatter = template.expression(`
  React.useMemo(() => new Intl.DateTimeFormat(%%locale%%, %%options%%), [])
`)

const buildFormatterCall = template.expression(`
  %%formatter%%.format(%%value%%)
`)

const buildPluralRules = template.expression(`
  React.useMemo(() => new Intl.PluralRules(%%locale%%, %%options%%), []).select(%%value%%)
`)

function icuNodesToJsExpression (icuNode: IcuNode, context: ComponentContext): t.Expression {
  if (Array.isArray(icuNode)) {
    return icuNodesToJsxExpression(icuNode, context)
  } else if (mf.isLiteralElement(icuNode)) {
    return t.stringLiteral(icuNode.value);
  } else if (mf.isArgumentElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return argIdentifier;
  } else if (mf.isSelectElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const cases = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsExpression(caseNode.value, context)];
    }) as [string, t.Expression][];
    const otherFragment = icuNodesToJsExpression(other.value, context);
    return switchExpression(
      argIdentifier,
      cases,
      otherFragment
    );
  } else if (mf.isPluralElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const cases = Object.entries(options).map(([name, caseNode]) => {
      return [name, icuNodesToJsExpression(caseNode.value, context)];
    }) as [string, t.Expression][];
    const otherFragment = icuNodesToJsExpression(other.value, context);
    return switchExpression(
      t.binaryExpression(
        '+',
        t.stringLiteral('='),
        t.binaryExpression(
          '-',
          argIdentifier,
          t.numericLiteral(icuNode.offset)
        )
      ),
      cases,
      switchExpression(
        buildPluralRules({
          locale: t.identifier('undefined'),
          options: t.identifier('undefined'),
          value: t.binaryExpression(
            '-',
            argIdentifier,
            t.numericLiteral(icuNode.offset)
          )
        }),
        cases,
        otherFragment
      )
    );
  } else if (mf.isNumberElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.addLocalConst(buildNumberFormatter({
      locale: context.getLocaleAsAst(),
      options: context.getFormatOptionsAsAst('number', icuNode.style as string)
    }));
    return buildFormatterCall({ formatter, value });
  } else if (mf.isDateElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.addLocalConst(buildDateTimeFormatter({
      locale: context.getLocaleAsAst(),
      options: context.getFormatOptionsAsAst('date', icuNode.style as string)
    }));
    return buildFormatterCall({ formatter, value });
  } else if (mf.isTimeElement(icuNode)) {
    const value = context.addArgument(icuNode.value);
    const formatter = context.addLocalConst(buildDateTimeFormatter({
      locale: context.getLocaleAsAst(),
      options: context.getFormatOptionsAsAst('time', icuNode.style as string)
    }));
    return buildFormatterCall({ formatter, value });
  } else {
    return t.nullLiteral()
  }
}

interface FormatterStyles {
  [style: string]: {
    [key: string]: string
  }
}

export interface Formats {
  number: FormatterStyles
  date: FormatterStyles
  time: FormatterStyles
}

function mergeFormats (...formattersList: Partial<Formats>[]) {
  return {
    number: Object.assign({}, ...formattersList.map(formatters => formatters.number)),
    date: Object.assign({}, ...formattersList.map(formatters => formatters.date)),
    time: Object.assign({}, ...formattersList.map(formatters => formatters.time))
  };
}

function createContext (options: ComponentContextInit): ComponentContext {
  return new ComponentContext(options);
}

interface ComponentContextInit {
  locale?: string
  formats?: Partial<Formats>
}

class ComponentContext {
  locale?: string
  formats: Formats
  args: Map<string, Argument>
  _localConsts: Map<string, t.Expression>
  _nextId: number

  constructor ({ locale, formats = {} }: ComponentContextInit) {
    this.locale = locale
    this.formats = mergeFormats(IntlMessageFormat.formats, formats)
    this.args = new Map()
    this._localConsts = new Map()
    this._nextId = 1;
  }

  _nextLocalUidentifierName () {
    // TODO: we might want to be smarter than this:
    return `__icur_local__${this._nextId++}`;
  }

  addArgument (name: string): t.Identifier {
    this.args.set(name, {});
    return t.identifier(name);
  }

  addLocalConst (init: t.Expression): t.Identifier {
    const name = this._nextLocalUidentifierName()
    this._localConsts.set(name, init);
    return t.identifier(name)
  }

  getLocaleAsAst (): t.Expression {
    return this.locale ? t.stringLiteral(this.locale) : t.identifier('undefined');
  }

  getFormatOptionsAsAst (type: keyof Formats, style: string): t.Expression {
    const format = this.formats[type][style];
    if (format) {
      return t.objectExpression(Object.entries(format).map(([key, value]) => {
        return t.objectProperty(t.identifier(key), t.stringLiteral(value));
      }));
    } else {
      return t.identifier('undefined');
    }
  }

  buildArgsAst() {
    if (this.args.size <= 0) {
      return [];
    } else {
      return [
        t.objectPattern(Array.from(this.args.entries(), ([name, arg]) => {
          const identifier = t.identifier(name);
          return t.objectProperty(
            identifier,
            identifier,
            false,
            true
          );
        }))
      ];
    }
  }

  buildConstsAst (): t.Statement[] {
    return Array.from(this._localConsts.entries(), ([name, init]) => {
      return t.variableDeclaration(
        'const', [
        t.variableDeclarator(t.identifier(name), init)
      ])
    })
  }
}

interface Options {
  locale?: string
  formats?: Partial<Formats>
}

export default function icuToReactComponent (componentName: string, icuStr: string, options: Options) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(componentName)) {
    throw new Error(`Invalid component name "${componentName}"`);
  }

  const context = createContext(options)
  const icuAst = mf.parse(icuStr);
  const returnValue = icuNodesToJsExpression(icuAst, context);
  const ast = t.functionDeclaration(
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
};
