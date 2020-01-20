import icur, { IcurOptions } from './index';
import * as vm from 'vm';
import * as babelCore from '@babel/core';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

function importFrom(code: string, options: IcurOptions) {
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
    (require, exports) => {
      ${cjs}
    }
  `)(requireFn, exports);
  return exports;
}

interface Messages {
  [key: string]: string;
}

type ComponentsOf<T, C> = {
  [K in keyof T]: C;
};

async function createComponents<C, T extends Messages>(
  messages: T,
  options: IcurOptions = {}
): Promise<ComponentsOf<T, C>> {
  const { code } = await icur(messages, options);
  // console.log(code);
  const components = importFrom(code, options) as ComponentsOf<T, C>;
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

export async function createStringComponent(
  message: string,
  options?: IcurOptions
): Promise<(props: any) => string> {
  const { Component } = await createComponents<
    (props: any) => string,
    { Component: string }
  >({ Component: message }, { ...options, react: false });
  return Component;
}

export async function createReactComponent(
  message: string,
  options?: IcurOptions
): Promise<React.ElementType> {
  const { Component } = await createComponents<
    React.ElementType,
    { Component: string }
  >({ Component: message }, { ...options, react: true });
  return Component;
}

export function renderString(elm: React.ElementType, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}

export function renderReact(elm: React.ElementType, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}

export async function renderMessageWithReact(
  message: string,
  options: IcurOptions,
  props: any
) {
  const { element } = await createComponents<
    React.ElementType,
    { element: string }
  >(
    { element: message },
    {
      ...options,
      react: true
    }
  );
  return renderReact(element, props);
}
