import icur from './index';
import * as vm from 'vm';
import * as babelCore from '@babel/core';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import * as util from 'util';

function importFrom (code) {
  const cjs = babelCore.transform(code, {
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-transform-react-jsx'
    ]
  }).code;

  const exports = {};
  vm.runInContext(cjs, vm.createContext({
    require,
    exports,
    // react logs errors in the console
    console: Object.assign(console, {
      ...console,
      error (msg, ...args) {
        throw new Error(util.format(msg, ...args));
      }
    }),
    // pass through Date constructor for instanceOf check
    Date,
    Error
  }));
  return exports;
}


type ComponentsOf<T> = {
  [K in keyof T]: React.ElementType
}

export function createComponents<T> (messages: T, locale?, formats = {}): ComponentsOf<T> {
  const { code } = icur(messages, locale, formats);
  console.log(code)
  const components = importFrom(code) as ComponentsOf<T>;
  for (const component of Object.values(components)) {
    // create unique names to invalidate warning cache
    // https://github.com/facebook/react/blob/db6ac5c01c4ad669db7ca264bc81ae5b3d6dfa01/src/isomorphic/classic/types/checkReactTypeSpec.js#L68
    // https://github.com/facebook/react/issues/4302
    // @ts-ignore
    component.displayName = `${component.name}<${Math.random().toString().slice(2)}>`;
  }
  return components;
}

export function render (elm, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}
