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
  args: Map<string, Argument>
  ast: t.Expression
}

function createFragment ({ ast, args }: Partial<Fragment> = {}): Fragment {
  return {
    ast: ast || t.nullLiteral(),
    args: args || new Map()
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

function interpolateJsxFragment (jsxFragment: t.JSXFragment, icuNodes: mf.MessageFormatElement[], context: Context) {
  const fragment = interpolateJsxFragmentChildren(jsxFragment.children, icuNodes, context);
  return {
    args: fragment.args,
    ast: t.jsxFragment(
      t.jsxOpeningFragment(),
      t.jsxClosingFragment(),
      fragment.ast
    )
  }
}

function interpolateJsxFragmentChildren (jsx: JSXFragmentChild[], icuNodes: mf.MessageFormatElement[], context: Context) {
  const ast: JSXFragmentChild[] = [];
  const args = new Map()

  for (const child of jsx) {
    if (t.isJSXFragment(child)) {
      const fragment = interpolateJsxFragment(child, icuNodes, context);
      ast.push(fragment.ast);
      mergeMaps(args, fragment.args);
    } else if (t.isJSXExpressionContainer(child)) {
      const { expression } = child
      if (!t.isNumericLiteral(expression)) {
        throw new Error('invalid AST');
      }
      const index = expression.value;
      const icuNode = icuNodes[index];
      const fragment = toFragment(icuNode, context);
      ast.push(t.jsxExpressionContainer(fragment.ast));
      mergeMaps(args, fragment.args);
    } else if (t.isJSXElement(child)) {
      const identifier = child.openingElement.name;
      if (!t.isJSXIdentifier(identifier)) {
        throw new Error('Invalid JSX element')
      }

      args.set(identifier.name, {});

      const fragment = interpolateJsxFragmentChildren(child.children, icuNodes, context)
      mergeMaps(args, fragment.args);

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

  return { ast, args }
}

function toJsx (icuNodes: mf.MessageFormatElement[], context: Context): Fragment {
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

function toFragment (icuNode: IcuNode, context: Context): Fragment {
  if (Array.isArray(icuNode)) {
    return toJsx(icuNode, context)
  } else if (mf.isLiteralElement(icuNode)) {
    return createFragment({
      ast: t.stringLiteral(icuNode.value)
    });
  } else if (mf.isArgumentElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    return createFragment({
      args: new Map([
        [icuArgumentName, {}]
      ]),
      ast: t.identifier(icuArgumentName)
    });
  } else if (mf.isSelectElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const casesFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, toFragment(caseNode.value, context)];
    }) as [string, Fragment][];
    const otherFragment = toFragment(other.value, context);
    return createFragment({
      args: mergeMaps(
        new Map([[icuArgumentName, {}]]),
        ...casesFragments.map(fragment => fragment[1].args),
        otherFragment.args,
      ),
      ast: switchExpression(
        t.identifier(icuArgumentName),
        casesFragments.map(([name, fragment]) => [name, fragment.ast]),
        otherFragment.ast
      )
    })
  } else if (mf.isPluralElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    if (!icuNode.options.hasOwnProperty('other')) {
      throw new Error('U_DEFAULT_KEYWORD_MISSING');
    }
    const { other, ...options } = icuNode.options;
    const casesFragments = Object.entries(options).map(([name, caseNode]) => {
      return [name, toFragment(caseNode.value, context)];
    }) as [string, Fragment][];
    const otherFragment = toFragment(other.value, context);
    return createFragment({
      args: mergeMaps(
        new Map([[icuArgumentName, {}]]),
        ...casesFragments.map(fragment => fragment[1].args),
        otherFragment.args,
      ),
      ast: switchExpression(
        t.binaryExpression(
          '+',
          t.stringLiteral('='),
          t.binaryExpression(
            '-',
            t.identifier(icuArgumentName),
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
              t.identifier(icuArgumentName),
              t.numericLiteral(icuNode.offset)
            )
          }),
          casesFragments.map(([name, fragment]) => [name, fragment.ast]),
          otherFragment.ast
        )
      )
    })
  } else if (mf.isNumberElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    return createFragment({
      args: new Map([
        [icuArgumentName, {}]
      ]),
      ast: buildNumberFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'number', icuNode.style as string),
        value: t.identifier(icuArgumentName)
      })
    });
  } else if (mf.isDateElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    return createFragment({
      args: new Map([
        [icuArgumentName, {}]
      ]),
      ast: buildDateFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'date', icuNode.style as string),
        value: t.identifier(icuArgumentName)
      })
    });
  } else if (mf.isTimeElement(icuNode)) {
    const icuArgumentName = icuNode.value;
    return createFragment({
      args: new Map([
        [icuArgumentName, {}]
      ]),
      ast: buildDateFormat({
        locale: t.stringLiteral('en'),
        options: getFormatOptionsAst(context.formats, 'time', icuNode.style as string),
        value: t.identifier(icuArgumentName)
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

interface Options {
  locale?: string
  formats?: Partial<Formats>
}

function mergeFormats (...formattersList: Partial<Formats>[]) {
  return {
    number: Object.assign({}, ...formattersList.map(formatters => formatters.number)),
    date: Object.assign({}, ...formattersList.map(formatters => formatters.date)),
    time: Object.assign({}, ...formattersList.map(formatters => formatters.time))
  };
}

interface Context {
  locale?: string
  formats: Formats
}

function createContext (options: Options): Context {
  return {
    locale: options.locale,
    formats: mergeFormats(IntlMessageFormat.formats, options.formats || {})
  }
}

interface ComponentContextInit {
  locale?: string
  formats?: Formats
}

class ComponentContext {
  locale?: string
  formats?: Formats
  constructor ({ locale, formats }: ComponentContextInit) {
    this.locale = locale
    this.formats = formats
  }
}

export default function icuToReactComponent (componentName: string, icuStr: string, options: Options) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(componentName)) {
    throw new Error(`Invalid component name "${componentName}"`);
  }

  const icuAst = mf.parse(icuStr);
  const fragment = toFragment(icuAst, createContext(options));
  const ast = t.functionDeclaration(
    t.identifier(componentName),
    buildArgsAst(fragment.args),
    t.blockStatement([
      t.returnStatement(fragment.ast)
    ])
  );

  return {
    ast,
    args: fragment.args
  };
};
