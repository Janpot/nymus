import * as t from 'babel-types';
import icuToReactComponent from './icu-to-react-component';
import * as babylon from'babylon';
import generate from '@babel/generator';
import { IntlMessageFormat } from 'intl-messageformat';
import template from "@babel/template";

function createConst (id, expression) {
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(id),
      expression
    )
  ]);
}

function mergeFormats (defaults, formats) {
  const merged = {};
  for (const type of Object.keys(defaults)) {
    merged[type] = Object.assign({}, defaults[type], formats[type]);
  }
  return merged;
}

function createHelpers (locales, formats) {
  // const locale = IntlMessageFormat.prototype._resolveLocale(locales);
  //const pluralFn = IntlMessageFormat.prototype._findPluralRuleFunction(locale);
  const locale = locales;
  const pluralFn = x => x
  const mergedFormats = mergeFormats(IntlMessageFormat.formats, formats);

  return createConst('$helpers', babylon.parseExpression(`{
    formats: ${JSON.stringify(mergedFormats)},

    pluralFn: ${pluralFn.toString()},

    number (n, style) {
      return new Intl.NumberFormat('${locale}', this.formats.number[style]).format(n);
    },

    date (date, style) {
      return new Intl.DateTimeFormat('${locale}', this.formats.date[style]).format(date);
    },

    time (date, style) {
      return new Intl.DateTimeFormat('${locale}', this.formats.time[style]).format(date);
    },

    select (arg, cases) {
      return cases[arg] || cases.other;
    },

    pluralize (arg, offset, ordinal, cases) {
      const n = arg - offset;
      return cases['=' + n] || cases[this.pluralFn(n, ordinal)] || cases.other;
    },

    ensureKey (maybeElm, key) {
      return React.isValidElement(maybeElm) && !maybeElm.key ? React.cloneElement(maybeElm, { key }) : maybeElm;
    },

    noopElm ({ children }) {
      return children;
    }
  }`));
}

function createPropTypes () {
  return createConst('$propTypes', babylon.parseExpression(`{
    numeric: (props, propName, componentName) => {
      const propValue = props[propName];
      if (typeof propValue !== 'number' && isNaN(Number(propValue))) {
        return new Error(
          'Invalid prop \`' + propName + '\` of type \`' + (typeof propValue) +
          '\` supplied to \`' + componentName + '\`, expected \`number\`'
        );
      }
    },

    numericOneOf (values) {
      const numericValues = values.map(Number);
      return (props, propName, componentName) => {
        const error = this.numeric(props, propName, componentName);
        if (error) {
          return error;
        }
        const value = Number(props[propName]);
        if (!numericValues.includes(value)) {
          return new Error(
            'Invalid prop \`' + propName + '\` of value \`' + value +
            '\` supplied to \`' + componentName + '\`, expected one of ' +
            JSON.stringify(numericValues)
          );
        }
      };
    },

    element: $$propTypes.oneOfType([
      $$propTypes.func,
      $$propTypes.string
    ]),

    node: $$propTypes.node,

    date: $$propTypes.instanceOf(Date),

    oneOf: $$propTypes.oneOf
  }`));
}

function createPropTypesForComponent (id, args) {
  return t.expressionStatement(
    t.assignmentExpression(
      '=',
      t.memberExpression(
        t.identifier(id),
        t.identifier('propTypes')
      ),
      t.objectExpression(args.map(arg => {
        return t.objectProperty(
          t.identifier(arg.name),
          arg.type.toPropTypesAst()
        );
      }))
    )
  );
}

function createExports (messages, locale, formats) {
  return [].concat(
    ...Object.entries(messages)
      .map(([componentName, message]) => {
        const { ast, args } = icuToReactComponent(componentName, message, { locale, formats });
        return [
          t.exportNamedDeclaration(ast, [])
        ];
      })
  );
}

export default function createModule (messages, locale = 'en', { formats = {} } = {}) {
  const program = t.program([
    template.ast`import * as React from 'react';`,
    ...createExports(messages, locale, formats)
  ]);
  return {
    code: generate(program).code,
    ast: program
  };
}
