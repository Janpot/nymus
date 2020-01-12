import * as mf from 'intl-messageformat-parser';
import { IntlMessageFormat } from 'intl-messageformat';
import template from "@babel/template";
import * as t from '@babel/types';
import * as babylon from '@babel/parser';

function mergeMaps<T, U> (dest: Map<T, U>, ...sources: Map<T, U>[]): Map<T, U> {
  for (const source of sources) {
    for (const [key, value] of source.entries()) {
      dest.set(key, value);
    }
  }
  return dest;
}

interface Argument {

}

interface Fragment {
  ast: t.Expression
}

function createFragment ({ ast }: Partial<Fragment> = {}): Fragment {
  return {
    ast: ast || t.nullLiteral()
  };
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

function interpolateJsxFragment (jsxFragment: t.JSXFragment, icuNodes: mf.MessageFormatElement[], context: ComponentContext) {
  const fragment = interpolateJsxFragmentChildren(jsxFragment.children, icuNodes, context);
  return {
    ast: t.jsxFragment(
      t.jsxOpeningFragment(),
      t.jsxClosingFragment(),
      fragment.ast
    )
  }
}

function interpolateJsxFragmentChildren (jsx: JSXFragmentChild[], icuNodes: mf.MessageFormatElement[], context: ComponentContext) {
  const ast: JSXFragmentChild[] = [];

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      const fragment = interpolateJsxFragment(child, icuNodes, context);
      ast.push(fragment.ast);
    } else if (t.isJSXExpressionContainer(child)) {
      const { expression } = child
      if (!t.isNumericLiteral(expression)) {
        throw new Error('invalid AST');
      }
      const index = expression.value;
      const icuNode = icuNodes[index];
      const fragment = toFragment(icuNode, context);
      ast.push(t.jsxExpressionContainer(fragment.ast));
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
        fragment.ast,
        child.selfClosing
      )
      ast.push(interpolatedChild)
    } else {
      ast.push(child)
    }
  }

  return { ast }
}

function toJsx (icuNodes: mf.MessageFormatElement[], context: ComponentContext): Fragment {
  if (icuNodes.length <= 0) {
    return createFragment({ ast: t.nullLiteral() });
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

  return createFragment(interpolateJsxFragment(jsxAst, icuNodes, context));
}

const buildNumberFormat = template.expression(`
  React.useMemo(() => new Intl.NumberFormat(%%locale%%, %%options%%), []).format(%%value%%)
`)

const buildDateFormat = template.expression(`
  React.useMemo(() => new Intl.DateTimeFormat(%%locale%%, %%options%%), []).format(%%value%%)
`)

const buildPluralRules = template.expression(`
  React.useMemo(() => new Intl.PluralRules(%%locale%%, %%options%%), []).select(%%value%%)
`)

function getFormatOptionsAst(formats: Formats, formatter: keyof Formats, argStyle: string) {
  const format = formats[formatter][argStyle];
  if (format) {
    return template.expression(JSON.stringify(format), {
      placeholderPattern: false
    })()
  } else {
    return t.identifier('undefined');
  }
}

function toFragment (icuNode: IcuNode, context: ComponentContext): Fragment {
  if (Array.isArray(icuNode)) {
    return toJsx(icuNode, context)
  } else if (mf.isLiteralElement(icuNode)) {
    return createFragment({
      ast: t.stringLiteral(icuNode.value)
    });
  } else if (mf.isArgumentElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return createFragment({
      ast: argIdentifier
    });
  } else if (mf.isSelectElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const casesFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, toFragment(caseNode.value, context)];
    }) as [string, Fragment][];
    const otherFragment = toFragment(other.value, context);
    return createFragment({
      ast: switchExpression(
        argIdentifier,
        casesFragments.map(([name, fragment]) => [name, fragment.ast]),
        otherFragment.ast
      )
    })
  } else if (mf.isPluralElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const casesFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, toFragment(caseNode.value, context)];
    }) as [string, Fragment][];
    const otherFragment = toFragment(other.value, context);
    return createFragment({
      ast: switchExpression(
        t.binaryExpression(
          '+',
          t.stringLiteral('='),
          t.binaryExpression(
            '-',
            argIdentifier,
            t.numericLiteral(icuNode.offset)
          )
        ),
        casesFragments.map(([name, fragment]) => [name, fragment.ast]),
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
          casesFragments.map(([name, fragment]) => [name, fragment.ast]),
          otherFragment.ast
        )
      )
    })
  } else if (mf.isNumberElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return createFragment({
      ast: buildNumberFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'number', icuNode.style as string),
        value: argIdentifier
      })
    });
  } else if (mf.isDateElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return createFragment({
      ast: buildDateFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'date', icuNode.style as string),
        value: argIdentifier
      })
    });
  } else if (mf.isTimeElement(icuNode)) {
    const argIdentifier = context.addArgument(icuNode.value);
    return createFragment({
      ast: buildDateFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'time', icuNode.style as string),
        value: argIdentifier
      })
    });
  } else {
    return createFragment({
      ast: t.nullLiteral()
    });
  }
}

function buildArgsAst (args: Map<string, Argument>) {
  if (args.size <= 0) {
    return [];
  } else {
    return [
      t.objectPattern(Array.from(args.entries(), ([name, arg]) => {
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

interface FormatterStyles {
  [style: string]: {
    [key: string]: any
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

  constructor ({ locale, formats = {} }: ComponentContextInit) {
    this.locale = locale
    this.formats = mergeFormats(IntlMessageFormat.formats, formats)
    this.args = new Map()
  }

  addArgument (name: string) {
    this.args.set(name, {});
    return t.identifier(name);
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
  const fragment = toFragment(icuAst, context);
  const ast = t.functionDeclaration(
    t.identifier(componentName),
    buildArgsAst(mergeMaps(new Map(), context.args)),
    t.blockStatement([
      t.returnStatement(fragment.ast)
    ])
  );

  return {
    ast
  };
};
