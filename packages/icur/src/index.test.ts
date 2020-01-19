/* eslint-env jest */

import {
  createReactComponent,
  renderReact,
  createStringComponent,
  renderString
} from './test-utils';
import * as React from 'react';
import { formatError } from './index';
import { IcurOptions } from '../dist';

type TestFunction = (
  createComponent: (msg: string, options?: IcurOptions) => Promise<any>,
  render: (component: any, props?: any) => string
) => void | Promise<void>;

function sharedTest(name: string, testFn: TestFunction) {
  it(`${name} [react]`, async () => {
    await testFn(createReactComponent, renderReact);
  });

  it(`${name} [string]`, async () => {
    await testFn(createStringComponent, renderString);
  });
}

describe('shared', () => {
  sharedTest('creates empty component', async (createComponent, render) => {
    const empty = await createComponent('');
    const result = render(empty);
    expect(result).toBe('');
  });

  sharedTest(
    'creates simple text component',
    async (createComponent, render) => {
      const simpleString = await createComponent('x');
      const result = render(simpleString);
      expect(result).toBe('x');
    }
  );

  sharedTest('handles ICU arguments', async (createComponent, render) => {
    const withArguments = await createComponent('x {a} y {b} z');
    const result = render(withArguments, { a: '1', b: '2' });
    expect(result).toBe('x 1 y 2 z');
  });

  sharedTest(
    'handles twice defined ICU arguments',
    async (createComponent, render) => {
      const argsTwice = await createComponent('{a} {a}');
      const result = render(argsTwice, { a: '1' });
      expect(result).toBe('1 1');
    }
  );

  sharedTest(
    "Doesn't fail on React named component",
    async (createComponent, render) => {
      const React = await createComponent('react');
      const result = render(React);
      expect(result).toBe('react');
    }
  );

  sharedTest('do select expressions', async (createComponent, render) => {
    const withSelect = await createComponent(
      '{gender, select, male{He} female{She} other{They}}'
    );
    const maleResult = render(withSelect, {
      gender: 'male'
    });
    expect(maleResult).toBe('He');
    const femaleResult = render(withSelect, {
      gender: 'female'
    });
    expect(femaleResult).toBe('She');
    const otherResult = render(withSelect, {
      gender: 'whatever'
    });
    expect(otherResult).toBe('They');
  });

  sharedTest('can nest select expressions', async (createComponent, render) => {
    const nestedSelect = await createComponent(`a{x, select,
          a1 {b{y, select,
            a11 {g}
            a12 {h}
            other {}
          }d}
          a2 {c{z, select,
            a21 {i}
            a22 {j}
            other {}
          }e}
          other {}
        }f`);
    expect(render(nestedSelect, { x: 'a1', y: 'a11' })).toBe('abgdf');
    expect(render(nestedSelect, { x: 'a1', y: 'a12' })).toBe('abhdf');
    expect(render(nestedSelect, { x: 'a2', z: 'a21' })).toBe('acief');
    expect(render(nestedSelect, { x: 'a2', z: 'a22' })).toBe('acjef');
  });

  sharedTest(
    'can format numbers and dates',
    async (createComponent, render) => {
      const msg = await createComponent(
        'At {theDate, time, medium} on {theDate, date, medium}, there was {text} on planet {planet, number, decimal}.'
      );
      const result = render(msg, {
        theDate: new Date(1507216343344),
        text: 'a disturbance in the Force',
        planet: 7
      });
      expect(result).toBe(
        'At 5:12:23 PM on Oct 5, 2017, there was a disturbance in the Force on planet 7.'
      );
    }
  );

  sharedTest('can format percentages', async (createComponent, render) => {
    const msg = await createComponent('Score: {percentage, number, percent}.');
    const result = render(msg, {
      percentage: 0.6549
    });
    expect(result).toBe('Score: 65%.');
  });

  sharedTest('can reuse formatters', async (createComponent, render) => {
    const msg = await createComponent(
      'Score: {score, number, percent}, Maximum: {max, number, percent}.'
    );
    const result = render(msg, {
      score: 0.6549,
      max: 0.9436
    });
    expect(result).toBe('Score: 65%, Maximum: 94%.');
  });

  sharedTest('can format currencies', async (createComponent, render) => {
    const msg = await createComponent('It costs {amount, number, USD}.', {
      locale: 'en-US',
      formats: {
        number: {
          USD: {
            style: 'currency',
            currency: 'USD'
          }
        }
      }
    });
    const result = render(msg, {
      amount: 123.456
    });
    expect(result).toBe('It costs $123.46.');
  });
});

function errorSnapshotTest(message: string) {
  it('error snapshot ', async () => {
    expect.assertions(1);
    try {
      await createReactComponent(message);
    } catch (err) {
      const formatted = formatError(message, err);
      expect(formatted).toMatchSnapshot();
    }
  });
}

describe('error formatting', () => {
  errorSnapshotTest('unclosed {argument message');
  errorSnapshotTest('<Comp prop="bar">foo</Comp>');
  errorSnapshotTest('<A.B>foo</A.B>');
  errorSnapshotTest(`
    {gender, select,
      male {He}
    }
  `);
  errorSnapshotTest('<>foo {bar}</> baz');
});

describe('with jsx', () => {
  it('understands jsx', async () => {
    const withJsx = await createReactComponent('<A>foo</A>');
    // TODO: will this be supported?
    // const result1 = renderReact(withJsx, {});
    // expect(result1).toBe('foo');
    const result2 = renderReact(withJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement('span', { className: 'bar' }, children)
    });
    expect(result2).toBe('<span class="bar">foo</span>');
  });

  it('understands jsx with argument', async () => {
    const withArgJsx = await createReactComponent('<A>foo {bar} baz</A>');
    // TODO: will this be supported?
    // const result1 = renderReact(withArgJsx, { bar: 'quux' });
    // expect(result1).toBe('foo quux baz');
    const result2 = renderReact(withArgJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement('span', { className: 'bla' }, children),
      bar: 'quux'
    });
    expect(result2).toBe('<span class="bla">foo quux baz</span>');
  });

  it('handles special characters', async () => {
    const htmlSpecialChars = await createReactComponent('Hel\'lo Wo"rld!');
    const result = renderReact(htmlSpecialChars);
    expect(result).toBe('Hel&#x27;lo Wo&quot;rld!');
  });

  it('can interpolate components', async () => {
    const interpolate = await createReactComponent('a {b} c');
    const result = renderReact(interpolate, {
      b: React.createElement('span', null, 'x')
    });
    expect(result).toBe('a <span>x</span> c');
  });

  it('can interpolate arrays', async () => {
    const interpolate = await createReactComponent('a {b} c');
    const result = renderReact(interpolate, {
      b: ['x', React.createElement('span', { key: 'key' }, 'y'), 'z']
    });
    expect(result).toBe('a x<span>y</span>z c');
  });

  it('understands jsx with <React />', async () => {
    const withReact = await createReactComponent('foo <React /> bar');
    const result = renderReact(withReact, { React: () => 'quux' });
    expect(result).toBe('foo quux bar');
  });

  it('can interpolate "React"', async () => {
    const withReact = await createReactComponent('foo {React} <A />baz');
    const result = renderReact(withReact, { React: 'bar', A: () => null });
    expect(result).toBe('foo bar baz');
  });

  it('understands nested jsx', async () => {
    const withNestedJsx = await createReactComponent(
      '<A>foo <B>bar</B> baz</A>'
    );
    const result1 = renderReact(withNestedJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) => children,
      B: ({ children }: React.PropsWithChildren<{}>) => children
    });
    expect(result1).toBe('foo bar baz');
  });

  it('understands self closing jsx', async () => {
    const selfClosing = await createReactComponent('a<B/>c');
    const result = renderReact(selfClosing, { B: () => 'b' });
    expect(result).toBe('abc');
  });

  it('can interpolate void elements', async () => {
    const selfClosing = await createReactComponent('<A/>');
    const result = renderReact(selfClosing, { A: 'br' });
    expect(result).toBe('<br/>');
  });
});
