import * as t from '@babel/types';
import generate from '@babel/generator';
import template from "@babel/template";
import icuToReactComponent from './icu-to-react-component';

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
