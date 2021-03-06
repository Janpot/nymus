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
    if (moduleId === 'react' && options.target !== 'react') {
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

export async function createComponents<T extends Messages>(
  messages: T,
  options?: CreateModuleOptions & { target?: 'react' },
  intlMock?: typeof Intl
): Promise<ComponentsOf<T, React.FunctionComponent<any>>>;
export async function createComponents<T extends Messages>(
  messages: T,
  options: CreateModuleOptions & { target: 'string' },
  intlMock?: typeof Intl
): Promise<ComponentsOf<T, (props?: any) => string>>;
export async function createComponents<T extends Messages, C>(
  messages: T,
  options: CreateModuleOptions = {},
  intlMock: typeof Intl = Intl
): Promise<ComponentsOf<T, C>> {
  const { code } = await createModule(messages, options);
  // console.log(code);
  const components = importFrom(code, options, intlMock) as ComponentsOf<T, C>;
  return components;
}

export async function createComponent(
  message: string,
  options?: CreateModuleOptions,
  intlMock: typeof Intl = Intl
): Promise<React.FunctionComponent<any>> {
  const { Component } = await createComponents<{ Component: string }>(
    { Component: message },
    { ...options, target: 'react' },
    intlMock
  );
  return Component;
}

export async function createTemplate(
  message: string,
  options?: CreateModuleOptions,
  intlMock: typeof Intl = Intl
): Promise<(props?: any) => string> {
  const { Component } = await createComponents<{ Component: string }>(
    { Component: message },
    { ...options, target: 'string' },
    intlMock
  );
  return Component;
}

export function render(elm: React.FunctionComponent<any>, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}
