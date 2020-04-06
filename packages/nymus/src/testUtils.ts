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
      presets: ['@babel/preset-react', '@babel/preset-env'],
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

type ComponentsOf<T> = {
  [K in keyof T]: React.FunctionComponent<any>;
};

export async function createComponents<C, T extends Messages>(
  messages: T,
  options: CreateModuleOptions = {},
  intlMock: typeof Intl = Intl
): Promise<ComponentsOf<T>> {
  const { code } = await createModule(messages, options);
  // console.log(code);
  const components = importFrom(code, options, intlMock) as ComponentsOf<T>;
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
