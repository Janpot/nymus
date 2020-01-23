/* eslint-env jest */

import { createComponent, render } from './testUtils';
import * as React from 'react';
import { formatError } from './index';

describe('shared', () => {
  it('creates empty component', async () => {
    const empty = await createComponent('');
    const result = render(empty);
    expect(result).toBe('');
    expect(typeof empty({})).toBe('string');
  });

  it('creates simple text component', async () => {
    const simpleString = await createComponent('x');
    const result = render(simpleString);
    expect(result).toBe('x');
    expect(typeof simpleString({})).toBe('string');
  });

  it('handles ICU arguments', async () => {
    const withArguments = await createComponent('x {a} y {b} z');
    const result = render(withArguments, { a: '1', b: '2' });
    expect(result).toBe('x 1 y 2 z');
  });

  it('handles single argument only', async () => {
    const singleArg = await createComponent('{a}');
    const result = render(singleArg, { a: '1' });
    expect(result).toBe('1');
  });

  it('handles twice defined ICU arguments', async () => {
    const argsTwice = await createComponent('{a} {a}');
    const result = render(argsTwice, { a: '1' });
    expect(result).toBe('1 1');
  });

  it('handles numeric input concatenation correctly', async () => {
    const argsTwice = await createComponent('{a}{b}');
    const result = render(argsTwice, { a: 2, b: 3 });
    expect(result).toBe('23');
  });

  it("Doesn't fail on React named component", async () => {
    const React = await createComponent('react');
    const result = render(React);
    expect(result).toBe('react');
  });

  it('do select expressions', async () => {
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

    expect(typeof withSelect({ gender: 'male' })).toBe('string');
  });

  it('can nest select expressions', async () => {
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

  it('can format numbers and dates', async () => {
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
  });

  it('makes string returning components for numbers, dates, times and pounds', async () => {
    const msg = await createComponent(
      '{today, date}, {today, time}, {count, number}, {count, plural, other {#}}'
    );

    const result = render(msg, {
      today: new Date(1507216343344),
      count: 123
    });

    expect(result).toBe('Oct 5, 2017, 5:12:23 PM, 123, 123');
    expect(
      typeof msg({
        today: new Date(1507216343344),
        count: 123
      })
    ).toBe('string');
  });

  it('Handles number skeleton with goup-off', async () => {
    const msg = await createComponent(
      '{amount, number, ::currency/CAD .0 group-off}',
      { locale: 'en-US' }
    );

    const result = render(msg, { amount: 123456.78 });
    expect(result).toBe('CA$123456.8');
  });

  it('Handles number skeleton', async () => {
    const msg = await createComponent('{amount, number, ::currency/GBP .0#}', {
      locale: 'en-US'
    });

    const result = render(msg, { amount: 123456.789 });
    expect(result).toBe('£123,456.79');
  });

  it('custom formats should work for time', async () => {
    const msg = await createComponent('Today is {time, time, verbose}', {
      formats: {
        time: {
          verbose: {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            timeZoneName: 'short'
          }
        }
      }
    });
    const result = render(msg, { time: new Date(0) });
    expect(result).toBe('Today is January 1, 1970, 1:00:00 AM GMT+1');
  });

  it('can format percentages', async () => {
    const msg = await createComponent('Score: {percentage, number, percent}.');
    const result = render(msg, {
      percentage: 0.6549
    });
    expect(result).toBe('Score: 65%.');
    expect(typeof msg({ percentage: 0.6549 })).toBe('string');
  });

  it('can reuse formatters', async () => {
    const spy = jest.spyOn(Intl, 'NumberFormat');
    const msg = await createComponent(
      'Score: {score, number, percent}, Maximum: {max, number, percent}.',
      {},
      Intl
    );
    const result = render(msg, {
      score: 0.6549,
      max: 0.9436
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toBe('Score: 65%, Maximum: 94%.');
    expect(
      typeof msg({
        score: 0.6549,
        max: 0.9436
      })
    ).toBe('string');
  });

  it('can reuse formatted values', async () => {
    // TODO: find way to count number of .format calls
    const msg = await createComponent(
      'Score: {score, number, percent}, Maximum: {score, number, percent}.',
      {},
      Intl
    );
    const result = render(msg, { score: 0.6549 });
    expect(result).toBe('Score: 65%, Maximum: 65%.');
  });

  it('can format currencies', async () => {
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

  it('should handle @ correctly', async () => {
    const msg = await createComponent('hi @{there}', { locale: 'en' });
    expect(
      render(msg, {
        there: '2008'
      })
    ).toBe('hi @2008');
  });

  describe('ported intl-messageformat tests', () => {
    describe('using a string pattern', () => {
      it('should properly replace direct arguments in the string', async () => {
        const mf = await createComponent('My name is {FIRST} {LAST}.');
        const output = render(mf, { FIRST: 'Anthony', LAST: 'Pipkin' });
        expect(output).toBe('My name is Anthony Pipkin.');
      });

      it('should not ignore zero values', async () => {
        const mf = await createComponent('I am {age} years old.');
        const output = render(mf, { age: 0 });
        expect(output).toBe('I am 0 years old.');
      });

      it.skip('should ignore false, null, and undefined', async () => {
        const mf = await createComponent('{a}{b}{c}');
        const output = render(mf, {
          a: false,
          b: null,
          c: undefined
        });
        expect(output).toBe('');
      });
    });

    describe('and plurals under the Arabic locale', () => {
      const msg =
        '' +
        'I have {numPeople, plural,' +
        'zero {zero points}' +
        'one {a point}' +
        'two {two points}' +
        'few {a few points}' +
        'many {lots of points}' +
        'other {some other amount of points}}' +
        '.';

      it('should match zero', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 0 });
        expect(output).toBe('I have zero points.');
      });

      it('should match one', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 1 });
        expect(output).toBe('I have a point.');
      });

      it('should match two', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 2 });
        expect(output).toBe('I have two points.');
      });

      it('should match few', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 5 });
        expect(output).toBe('I have a few points.');
      });

      it('should match many', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 20 });
        expect(output).toBe('I have lots of points.');
      });

      it('should match other', async () => {
        const msgFmt = await createComponent(msg, { locale: 'ar' });
        const output = render(msgFmt, { numPeople: 100 });
        expect(output).toBe('I have some other amount of points.');
      });
    });

    describe('with plural and select', () => {
      var simple = {
        en: '{NAME} went to {CITY}.',
        fr:
          '{NAME} est {GENDER, select, ' +
          'female {allée}' +
          'other {allé}}' +
          ' à {CITY}.'
      };

      var complex = {
        en: '{TRAVELLERS} went to {CITY}.',

        fr:
          '{TRAVELLERS} {TRAVELLER_COUNT, plural, ' +
          '=1 {est {GENDER, select, ' +
          'female {allée}' +
          'other {allé}}}' +
          'other {sont {GENDER, select, ' +
          'female {allées}' +
          'other {allés}}}}' +
          ' à {CITY}.'
      };

      var maleObj = {
        NAME: 'Tony',
        CITY: 'Paris',
        GENDER: 'male'
      };

      var femaleObj = {
        NAME: 'Jenny',
        CITY: 'Paris',
        GENDER: 'female'
      };

      var maleTravelers = {
        TRAVELLERS: 'Lucas, Tony and Drew',
        TRAVELLER_COUNT: 3,
        GENDER: 'male',
        CITY: 'Paris'
      };

      var femaleTravelers = {
        TRAVELLERS: 'Monica',
        TRAVELLER_COUNT: 1,
        GENDER: 'female',
        CITY: 'Paris'
      };

      it('should format message en-US simple with different objects', async () => {
        const simpleEn = await createComponent(simple.en, {
          locale: 'en-US'
        });
        expect(render(simpleEn, maleObj)).toBe('Tony went to Paris.');
        expect(render(simpleEn, femaleObj)).toBe('Jenny went to Paris.');
      });

      it('should format message fr-FR simple with different objects', async () => {
        const simpleFr = await createComponent(simple.fr, {
          locale: 'fr-FR'
        });
        expect(render(simpleFr, maleObj)).toBe('Tony est allé à Paris.');
        expect(render(simpleFr, femaleObj)).toBe('Jenny est allée à Paris.');
      });

      it('should format message en-US complex with different objects', async () => {
        const complexEn = await createComponent(complex.en, {
          locale: 'en-US'
        });
        expect(render(complexEn, maleTravelers)).toBe(
          'Lucas, Tony and Drew went to Paris.'
        );
        expect(render(complexEn, femaleTravelers)).toBe(
          'Monica went to Paris.'
        );
      });

      it('should format message fr-FR complex with different objects', async () => {
        const complexFr = await createComponent(complex.fr, {
          locale: 'fr-FR'
        });
        expect(render(complexFr, maleTravelers)).toBe(
          'Lucas, Tony and Drew sont allés à Paris.'
        );
        expect(render(complexFr, femaleTravelers)).toBe(
          'Monica est allée à Paris.'
        );
      });
    });

    describe('and change the locale with different counts', () => {
      const messages = {
        en:
          '{COMPANY_COUNT, plural, ' +
          '=1 {One company}' +
          'other {# companies}}' +
          ' published new books.',

        ru:
          '{COMPANY_COUNT, plural, ' +
          '=1 {Одна компания опубликовала}' +
          'one {# компания опубликовала}' +
          'few {# компании опубликовали}' +
          'many {# компаний опубликовали}' +
          'other {# компаний опубликовали}}' +
          ' новые книги.'
      };

      it('should format a message with en-US locale', async () => {
        const msgFmt = await createComponent(messages.en, {
          locale: 'en-US'
        });
        expect(render(msgFmt, { COMPANY_COUNT: 0 })).toBe(
          '0 companies published new books.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 1 })).toBe(
          'One company published new books.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 2 })).toBe(
          '2 companies published new books.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 5 })).toBe(
          '5 companies published new books.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 10 })).toBe(
          '10 companies published new books.'
        );
      });

      it('should format a message with ru-RU locale', async () => {
        const msgFmt = await createComponent(messages.ru, {
          locale: 'ru-RU'
        });
        expect(render(msgFmt, { COMPANY_COUNT: 0 })).toBe(
          '0 компаний опубликовали новые книги.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 1 })).toBe(
          'Одна компания опубликовала новые книги.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 2 })).toBe(
          '2 компании опубликовали новые книги.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 5 })).toBe(
          '5 компаний опубликовали новые книги.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 10 })).toBe(
          '10 компаний опубликовали новые книги.'
        );
        expect(render(msgFmt, { COMPANY_COUNT: 21 })).toBe(
          '21 компания опубликовала новые книги.'
        );
      });
    });

    describe('selectordinal arguments', () => {
      var msg =
        'This is my {year, selectordinal, one{#st} two{#nd} few{#rd} other{#th}} birthday.';

      it('should use ordinal pluralization rules', async () => {
        const msgFmt = await createComponent(msg, { locale: 'en' });
        expect(render(msgFmt, { year: 1 })).toBe('This is my 1st birthday.');
        expect(render(msgFmt, { year: 2 })).toBe('This is my 2nd birthday.');
        expect(render(msgFmt, { year: 3 })).toBe('This is my 3rd birthday.');
        expect(render(msgFmt, { year: 4 })).toBe('This is my 4th birthday.');
        expect(render(msgFmt, { year: 11 })).toBe('This is my 11th birthday.');
        expect(render(msgFmt, { year: 21 })).toBe('This is my 21st birthday.');
        expect(render(msgFmt, { year: 22 })).toBe('This is my 22nd birthday.');
        expect(render(msgFmt, { year: 33 })).toBe('This is my 33rd birthday.');
        expect(render(msgFmt, { year: 44 })).toBe('This is my 44th birthday.');
        expect(render(msgFmt, { year: 1024 })).toBe(
          'This is my 1,024th birthday.'
        );
      });
    });
  });
});

function errorSnapshotTest(message: string) {
  it('error snapshot ', async () => {
    expect.assertions(1);
    try {
      await createComponent(message);
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
    const withJsx = await createComponent('<A>foo</A>');
    // TODO: will this be supported?
    // const result1 = renderReact(withJsx, {});
    // expect(result1).toBe('foo');
    const result2 = render(withJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement('span', { className: 'bar' }, children)
    });
    expect(result2).toBe('<span class="bar">foo</span>');
  });

  it('understands jsx with argument', async () => {
    const withArgJsx = await createComponent('<A>foo {bar} baz</A>');
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

  it('handles special characters', async () => {
    const htmlSpecialChars = await createComponent('Hel\'lo Wo"rld!');
    const result = render(htmlSpecialChars);
    expect(result).toBe('Hel&#x27;lo Wo&quot;rld!');
  });

  it('can interpolate components', async () => {
    const interpolate = await createComponent('a {b} c');
    const result = render(interpolate, {
      b: React.createElement('span', null, 'x')
    });
    expect(result).toBe('a <span>x</span> c');
  });

  it('can interpolate arrays', async () => {
    const interpolate = await createComponent('a {b} c');
    const result = render(interpolate, {
      b: ['x', React.createElement('span', { key: 'key' }, 'y'), 'z']
    });
    expect(result).toBe('a x<span>y</span>z c');
  });

  it('understands jsx with <React />', async () => {
    const withReact = await createComponent('foo <React /> bar');
    const result = render(withReact, { React: () => 'quux' });
    expect(result).toBe('foo quux bar');
  });

  it('can interpolate "React"', async () => {
    const withReact = await createComponent('foo {React} <A />baz');
    const result = render(withReact, { React: 'bar', A: () => null });
    expect(result).toBe('foo bar baz');
  });

  it('understands nested jsx', async () => {
    const withNestedJsx = await createComponent('<A>foo <B>bar</B> baz</A>');
    const result1 = render(withNestedJsx, {
      A: ({ children }: React.PropsWithChildren<{}>) => children,
      B: ({ children }: React.PropsWithChildren<{}>) => children
    });
    expect(result1).toBe('foo bar baz');
  });

  it('understands self closing jsx', async () => {
    const selfClosing = await createComponent('a<B/>c');
    const result = render(selfClosing, { B: () => 'b' });
    expect(result).toBe('abc');
  });

  it('can interpolate void elements', async () => {
    const selfClosing = await createComponent('<A/>');
    const result = render(selfClosing, { A: 'br' });
    expect(result).toBe('<br/>');
  });
});
