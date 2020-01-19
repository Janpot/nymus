import icur, { IcurOptions } from './index';
import * as vm from 'vm';
import * as babelCore from '@babel/core';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

function importFrom(code: string) {
  const { code: cjs } =
    babelCore.transformSync(code, {
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-transform-react-jsx'
      ]
    }) || {};

  if (!cjs) {
    throw new Error(`Compilation result is empty for "${code}"`);
  }

  const exports = {};
  vm.runInThisContext(`
    (require, exports) => {
      ${cjs}
    }
  `)(require, exports);
  return exports;
}

interface Messages {
  [key: string]: string;
}

type ComponentsOf<T> = {
  [K in keyof T]: React.ElementType;
};

export async function createComponents<T extends Messages>(
  messages: T,
  options?: IcurOptions
): Promise<ComponentsOf<T>> {
  const { code } = await icur(messages, options);
  // console.log(code);
  const components = importFrom(code) as ComponentsOf<T>;
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

export async function createReactComponent(
  message: string,
  options?: IcurOptions
): Promise<React.ElementType> {
  const { Component } = await createComponents({ Component: message }, options);
  return Component;
}

export function renderReact(elm: React.ElementType, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}

export async function renderMessageWithReact(
  message: string,
  options: IcurOptions,
  props: any
) {
  const { element } = await createComponents(
    { element: message },
    {
      ...options,
      react: true
    }
  );
  return renderReact(element, props);
}
