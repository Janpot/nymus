/* eslint-env jest */

import { createComponents, render } from './test-utils';
import * as React from 'react';
import { formatError } from './index';

describe('icur', () => {
  it('creates empty component', () => {
    const { empty } = createComponents({ empty: '' });
    const result = render(empty);
    expect(result).toBe('');
  });

  it('creates simple text component', () => {
    const { simpleString } = createComponents({ simpleString: 'x' });
    const result = render(simpleString);
    expect(result).toBe('x');
  });

  it('handles special characters', () => {
    const { htmlSpecialChars } = createComponents({
      htmlSpecialChars: 'Hel\'lo Wo"rld!'
    });
    const result = render(htmlSpecialChars);
    expect(result).toBe('Hel&#x27;lo Wo&quot;rld!');
  });

  it('handles ICU arguments', () => {
    const { withArguments } = createComponents({
      withArguments: 'x {a} y {b} z'
    });
    const result = render(withArguments, { a: '1', b: '2' });
    expect(result).toBe('x 1 y 2 z');
  });

  it('handles twice defined ICU arguments', () => {
    const { argsTwice } = createComponents({
      argsTwice: '{a} {a}'
    });
    const result = render(argsTwice, { a: '1' });
    expect(result).toBe('1 1');
  });

  it('can interpolate components', () => {
    const { interpolate } = createComponents({
      interpolate: 'a {b} c'
    });
    const result = render(interpolate, {
      b: React.createElement('span', null, 'x')
    });
    expect(result).toBe('a <span>x</span> c');
  });

  it('can interpolate arrays', () => {
    const { interpolate } = createComponents({
      interpolate: 'a {b} c'
    });
    const result = render(interpolate, {
      b: ['x', React.createElement('span', { key: 'key' }, 'y'), 'z']
    });
    expect(result).toBe('a x<span>y</span>z c');
  });

  it("Doesn't fail on React named component", () => {
    const { React } = createComponents({ React: 'react' });
    const result = render(React);
    expect(result).toBe('react');
  });

  it('do select expressions', () => {
    const { withSelect } = createComponents({
      withSelect: '{gender, select, male{He} female{She} other{They}}'
    });
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

  it('can nest select expressions', () => {
    const { nestedSelect } = createComponents({
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
    expect(render(nestedSelect, { x: 'a1', y: 'a11' })).toBe('abgdf');
    expect(render(nestedSelect, { x: 'a1', y: 'a12' })).toBe('abhdf');
    expect(render(nestedSelect, { x: 'a2', z: 'a21' })).toBe('acief');
    expect(render(nestedSelect, { x: 'a2', z: 'a22' })).toBe('acjef');
  });

  it('understands jsx', () => {
    const { withJsx } = createComponents({
      withJsx: '<A>foo</A>'
    });
    // TODO: will this be supported?
    // const result1 = render(withJsx, {});
    // expect(result1).toBe('foo');
    const result2 = render(withJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement('span', { className: 'bar' }, children)
    });
    expect(result2).toBe('<span class="bar">foo</span>');
  });

  it('understands jsx with argument', () => {
    const { withArgJsx } = createComponents({
      withArgJsx: '<A>foo {bar} baz</A>'
    });
    // TODO: will this be supported?
    // const result1 = render(withArgJsx, { bar: 'quux' });
    // expect(result1).toBe('foo quux baz');
    const result2 = render(withArgJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement('span', { className: 'bla' }, children),
      bar: 'quux'
    });
    expect(result2).toBe('<span class="bla">foo quux baz</span>');
  });

  it('understands jsx with fragments', () => {
    const { withFragment } = createComponents({
      withFragment: '<>foo {bar}</> baz'
    });
    const result = render(withFragment, {
      bar: 'quux'
    });
    expect(result).toBe('foo quux baz');
  });

  it('can interpolate "React"', () => {
    const { withReact } = createComponents({
      withReact: 'foo {React} <A />baz'
    });
    const result = render(withReact, { React: 'bar', A: () => null });
    expect(result).toBe('foo bar baz');
  });

  it('understands jsx with <React />', () => {
    const { withReact } = createComponents({
      withReact: 'foo <React /> bar'
    });
    const result = render(withReact, { React: () => 'quux' });
    expect(result).toBe('foo quux bar');
  });

  it('understands nested jsx', () => {
    const { withNestedJsx } = createComponents({
      withNestedJsx: '<A>foo <B>bar</B> baz</A>'
    });
    const result1 = render(withNestedJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) => children,
      B: ({ children }: React.PropsWithChildren<{}>) => children
    });
    expect(result1).toBe('foo bar baz');
  });

  it('understands self closing jsx', () => {
    const { selfClosing } = createComponents({ selfClosing: 'a<B/>c' });
    const result = render(selfClosing, { B: () => 'b' });
    expect(result).toBe('abc');
  });

  it('can interpolate void elements', () => {
    const { selfClosing } = createComponents({ selfClosing: '<A/>' });
    const result = render(selfClosing, { A: 'br' });
    expect(result).toBe('<br/>');
  });

  it('can interpolate with components', () => {
    const { msg1, msg2, msg3 } = createComponents({
      msg1: 'a {b} c {d} e',
      msg2: 'f',
      msg3: 'g'
    });
    const msg2Elm = React.createElement(msg2);
    const msg3Elm = React.createElement(msg3);
    const result = render(msg1, { b: msg2Elm, d: msg3Elm });
    expect(result).toBe('a f c g e');
  });
});

function errorSnapshotTest(message: string) {
  it('error snapshot ', () => {
    expect.assertions(1);
    try {
      createComponents({ message });
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

describe('numbers/dates', () => {
  it('can format numbers and dates', () => {
    const { msg } = createComponents({
      msg:
        'At {theDate, time, medium} on {theDate, date, medium}, there was {text} on planet {planet, number, decimal}.'
    });
    const result = render(msg, {
      theDate: new Date(1507216343344),
      text: 'a disturbance in the Force',
      planet: 7
    });
    expect(result).toBe(
      'At 5:12:23 PM on Oct 5, 2017, there was a disturbance in the Force on planet 7.'
    );
  });

  it('can format percentages', () => {
    const { msg } = createComponents({
      msg: 'Score: {percentage, number, percent}.'
    });
    const result = render(msg, {
      percentage: 0.6549
    });
    expect(result).toBe('Score: 65%.');
  });

  it('can reuse formatters', () => {
    const { msg } = createComponents({
      msg: 'Score: {score, number, percent}, Maximum: {max, number, percent}.'
    });
    const result = render(msg, {
      score: 0.6549,
      max: 0.9436
    });
    expect(result).toBe('Score: 65%, Maximum: 94%.');
  });

  it('can format currencies', () => {
    const { msg } = createComponents(
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
    const result = render(msg, {
      amount: 123.456
    });
    expect(result).toBe('It costs $123.46.');
  });

  describe.skip('propTypes', () => {
    it('allows for numbers', () => {
      const { msg } = createComponents({ msg: '{x, number}' });
      expect(render(msg, { x: 23 })).toBe('23');
    });

    it('errors on non-numbers', () => {
      const { msg } = createComponents({ msg: '{x, number}' });
      expect(() => {
        render(msg, { x: 'hello' });
      }).toThrow(/Failed prop type/);
    });

    it('allows NaN', () => {
      const { msg } = createComponents({ msg: '{x, number}' });
      expect(render(msg, { x: NaN })).toBe('NaN');
    });

    it('allows for numbers represented as strings', () => {
      const { msg } = createComponents({ msg: '{x, number}' });
      expect(render(msg, { x: '41' })).toBe('41');
    });

    it('errors on conflicting types number > date', () => {
      expect(() => {
        createComponents({ msg: '{x, number}{x, date}' });
      }).toThrow(/Incompatible types for "x"/);
    });

    it('errors on conflicting types date > number', () => {
      expect(() => {
        createComponents({ msg: '{x, number}{x, date}' });
      }).toThrow(/Incompatible types for "x"/);
    });

    it('errors on conflicting types select > number', () => {
      expect(() => {
        createComponents({ msg: '{x, select, a {y} b {z}} {x, number}' });
      }).toThrow(/Incompatible types for "x"/);
    });

    it('errors on conflicting types number > select', () => {
      expect(() => {
        createComponents({ msg: '{x, number} {x, select, a {y} b {z}}' });
      }).toThrow(/Incompatible types for "x"/);
    });

    it("doesn't error on compatible select/number types", () => {
      const { msg } = createComponents({
        msg: '{x, number} {x, select, 1 {y} 2 {z}}'
      });
      expect(render(msg, { x: '1' })).toBe('1 y');
      expect(render(msg, { x: 2 })).toBe('2 z');
    });

    it('errors on incompatible select/number types (string)', () => {
      const { msg } = createComponents({
        msg: '{x, number} {x, select, 1 {y} 2 {z}}'
      });
      expect(() => {
        render(msg, { x: 'hello' });
      }).toThrow(/Failed prop type/);
    });

    it('errors on incompatible select/number types (out of bounds)', () => {
      const { msg } = createComponents({
        msg: '{x, number} {x, select, 1 {y} 2 {z}}'
      });
      expect(() => {
        render(msg, { x: 3 });
      }).toThrow(/Failed prop type/);
    });

    it('renders dates', () => {
      const { msg } = createComponents({
        msg: '{x, date, short} {x, time, short}'
      });
      expect(render(msg, { x: new Date(1507376462024) })).toBe(
        '10/7/17 1:41 PM'
      );
    });

    it('errors on wrong date type', () => {
      const { msg } = createComponents({ msg: '{x, date}' });
      expect(() => {
        render(msg, { x: 'not a date' });
      }).toThrow(/Failed prop type/);
    });

    it('errors on wrong time type', () => {
      const { msg } = createComponents({ msg: '{x, time}' });
      expect(() => {
        render(msg, { x: 'not a date' });
      }).toThrow(/Failed prop type/);
    });
  });
});
