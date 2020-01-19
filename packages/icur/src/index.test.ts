/* eslint-env jest */

import { createComponents, renderReact } from './test-utils';
import * as React from 'react';
import { formatError } from './index';

describe('shared', () => {
  it('creates empty component', async () => {
    const { empty } = await createComponents({ empty: '' });
    const result = renderReact(empty);
    expect(result).toBe('');
  });

  it('creates simple text component', async () => {
    const { simpleString } = await createComponents({ simpleString: 'x' });
    const result = renderReact(simpleString);
    expect(result).toBe('x');
  });

  it('handles ICU arguments', async () => {
    const { withArguments } = await createComponents({
      withArguments: 'x {a} y {b} z'
    });
    const result = renderReact(withArguments, { a: '1', b: '2' });
    expect(result).toBe('x 1 y 2 z');
  });

  it('handles twice defined ICU arguments', async () => {
    const { argsTwice } = await createComponents({
      argsTwice: '{a} {a}'
    });
    const result = renderReact(argsTwice, { a: '1' });
    expect(result).toBe('1 1');
  });

  it('can interpolate "React"', async () => {
    const { withReact } = await createComponents({
      withReact: 'foo {React} <A />baz'
    });
    const result = renderReact(withReact, { React: 'bar', A: () => null });
    expect(result).toBe('foo bar baz');
  });

  it("Doesn't fail on React named component", async () => {
    const { React } = await createComponents({ React: 'react' });
    const result = renderReact(React);
    expect(result).toBe('react');
  });

  it('do select expressions', async () => {
    const { withSelect } = await createComponents({
      withSelect: '{gender, select, male{He} female{She} other{They}}'
    });
    const maleResult = renderReact(withSelect, {
      gender: 'male'
    });
    expect(maleResult).toBe('He');
    const femaleResult = renderReact(withSelect, {
      gender: 'female'
    });
    expect(femaleResult).toBe('She');
    const otherResult = renderReact(withSelect, {
      gender: 'whatever'
    });
    expect(otherResult).toBe('They');
  });

  it('can nest select expressions', async () => {
    const { nestedSelect } = await createComponents({
      nestedSelect: `a{x, select,
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
        }f`
    });
    expect(renderReact(nestedSelect, { x: 'a1', y: 'a11' })).toBe('abgdf');
    expect(renderReact(nestedSelect, { x: 'a1', y: 'a12' })).toBe('abhdf');
    expect(renderReact(nestedSelect, { x: 'a2', z: 'a21' })).toBe('acief');
    expect(renderReact(nestedSelect, { x: 'a2', z: 'a22' })).toBe('acjef');
  });

  it('can format numbers and dates', async () => {
    const { msg } = await createComponents({
      msg:
        'At {theDate, time, medium} on {theDate, date, medium}, there was {text} on planet {planet, number, decimal}.'
    });
    const result = renderReact(msg, {
      theDate: new Date(1507216343344),
      text: 'a disturbance in the Force',
      planet: 7
    });
    expect(result).toBe(
      'At 5:12:23 PM on Oct 5, 2017, there was a disturbance in the Force on planet 7.'
    );
  });

  it('can format percentages', async () => {
    const { msg } = await createComponents({
      msg: 'Score: {percentage, number, percent}.'
    });
    const result = renderReact(msg, {
      percentage: 0.6549
    });
    expect(result).toBe('Score: 65%.');
  });

  it('can reuse formatters', async () => {
    const { msg } = await createComponents({
      msg: 'Score: {score, number, percent}, Maximum: {max, number, percent}.'
    });
    const result = renderReact(msg, {
      score: 0.6549,
      max: 0.9436
    });
    expect(result).toBe('Score: 65%, Maximum: 94%.');
  });

  it('can format currencies', async () => {
    const { msg } = await createComponents(
      {
        msg: 'It costs {amount, number, USD}.'
      },
      {
        locale: 'en-US',
        formats: {
          number: {
            USD: {
              style: 'currency',
              currency: 'USD'
            }
          }
        }
      }
    );
    const result = renderReact(msg, {
      amount: 123.456
    });
    expect(result).toBe('It costs $123.46.');
  });
});

function errorSnapshotTest(message: string) {
  it('error snapshot ', async () => {
    expect.assertions(1);
    try {
      await createComponents({ message });
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
});

describe('with jsx', () => {
  it('understands jsx', async () => {
    const { withJsx } = await createComponents({
      withJsx: '<A>foo</A>'
    });
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
    const { withArgJsx } = await createComponents({
      withArgJsx: '<A>foo {bar} baz</A>'
    });
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
    const { htmlSpecialChars } = await createComponents({
      htmlSpecialChars: 'Hel\'lo Wo"rld!'
    });
    const result = renderReact(htmlSpecialChars);
    expect(result).toBe('Hel&#x27;lo Wo&quot;rld!');
  });

  it('can interpolate components', async () => {
    const { interpolate } = await createComponents({
      interpolate: 'a {b} c'
    });
    const result = renderReact(interpolate, {
      b: React.createElement('span', null, 'x')
    });
    expect(result).toBe('a <span>x</span> c');
  });

  it('can interpolate arrays', async () => {
    const { interpolate } = await createComponents({
      interpolate: 'a {b} c'
    });
    const result = renderReact(interpolate, {
      b: ['x', React.createElement('span', { key: 'key' }, 'y'), 'z']
    });
    expect(result).toBe('a x<span>y</span>z c');
  });

  it('understands jsx with fragments', async () => {
    const { withFragment } = await createComponents({
      withFragment: '<>foo {bar}</> baz'
    });
    const result = renderReact(withFragment, {
      bar: 'quux'
    });
    expect(result).toBe('foo quux baz');
  });

  it('understands jsx with <React />', async () => {
    const { withReact } = await createComponents({
      withReact: 'foo <React /> bar'
    });
    const result = renderReact(withReact, { React: () => 'quux' });
    expect(result).toBe('foo quux bar');
  });

  it('understands nested jsx', async () => {
    const { withNestedJsx } = await createComponents({
      withNestedJsx: '<A>foo <B>bar</B> baz</A>'
    });
    const result1 = renderReact(withNestedJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) => children,
      B: ({ children }: React.PropsWithChildren<{}>) => children
    });
    expect(result1).toBe('foo bar baz');
  });

  it('understands self closing jsx', async () => {
    const { selfClosing } = await createComponents({ selfClosing: 'a<B/>c' });
    const result = renderReact(selfClosing, { B: () => 'b' });
    expect(result).toBe('abc');
  });

  it('can interpolate void elements', async () => {
    const { selfClosing } = await createComponents({ selfClosing: '<A/>' });
    const result = renderReact(selfClosing, { A: 'br' });
    expect(result).toBe('<br/>');
  });

  it('can interpolate with components', async () => {
    const { msg1, msg2, msg3 } = await createComponents({
      msg1: 'a {b} c {d} e',
      msg2: 'f',
      msg3: 'g'
    });
    const msg2Elm = React.createElement(msg2);
    const msg3Elm = React.createElement(msg3);
    const result = renderReact(msg1, { b: msg2Elm, d: msg3Elm });
    expect(result).toBe('a f c g e');
  });
});
