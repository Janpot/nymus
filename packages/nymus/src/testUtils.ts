import createModule, { CreateModuleOptions } from './index';
import * as vm from 'vm';
import * as babelCore from '@babel/core';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

function importFrom(
  code: string,
  options: CreateModuleOptions,
  intlMock = Intl
) {
  const { code: cjs } =
    babelCore.transformSync(code, {
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }) || {};

  if (!cjs) {
    throw new Error(`Compilation result is empty for "${code}"`);
  }

  const exports = {};
  const requireFn = (moduleId: string) => {
    if (moduleId === 'react' && !options.react) {
      throw new Error('importing react is not allowed');
    }
    return require(moduleId);
  };
  vm.runInThisContext(`
    (require, exports, Intl) => {
      ${cjs}
    }
  `)(requireFn, exports, intlMock);
  return exports;
}

interface Messages {
  [key: string]: string;
}

type ComponentsOf<T, C> = {
  [K in keyof T]: C;
};

export async function createComponents<C, T extends Messages>(
  messages: T,
  options: CreateModuleOptions = {},
  intlMock: typeof Intl = Intl
): Promise<ComponentsOf<T, C>> {
  const { code } = await createModule(messages, options);
  // console.log(code);
  const components = importFrom(code, options, intlMock) as ComponentsOf<T, C>;
  for (const component of Object.values(components)) {
    // create unique names to invalidate warning cache
    // https://github.com/facebook/react/blob/db6ac5c01c4ad669db7ca264bc81ae5b3d6dfa01/src/isomorphic/classic/types/checkReactTypeSpec.js#L68
    // https://github.com/facebook/react/issues/4302
    // @ts-ignore
    component.displayName = `${component.name}<${Math.random()
      .toString()
      .slice(2)}>`;
  }
  return components;
}

export async function createComponent(
  message: string,
  options?: CreateModuleOptions,
  intlMock: typeof Intl = Intl
): Promise<React.FunctionComponent<any>> {
  const { Component } = await createComponents<
    React.FunctionComponent<any>,
    { Component: string }
  >({ Component: message }, { ...options, react: true }, intlMock);
  return Component;
}

export function render(elm: React.FunctionComponent<any>, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}
