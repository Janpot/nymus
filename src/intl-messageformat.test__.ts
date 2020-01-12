/* eslint-env mocha */

const { assert } = require('chai');
const { createComponents, render } = require('./utils');

describe('ported intl-messageformat tests', () => {
  describe('using a string pattern', () => {
    it('should properly replace direct arguments in the string', () => {
      const { mf } = createComponents({ mf: 'My name is {FIRST} {LAST}.' });
      const output = render(mf, { FIRST: 'Anthony', LAST: 'Pipkin' });
      assert.strictEqual(output, 'My name is Anthony Pipkin.');
    });

    it('should not ignore zero values', () => {
      const { mf } = createComponents({ mf: 'I am {age} years old.' });
      const output = render(mf, { age: 0 });
      assert.strictEqual(output, 'I am 0 years old.');
    });

    it('should ignore false, null, and undefined', () => {
      const { mf } = createComponents({ mf: '{a}{b}{c}' });
      const output = render(mf, {
        a: false,
        b: null,
        c: undefined
      });
      assert.strictEqual(output, '');
    });
  });

  describe('and plurals under the Arabic locale', () => {
    const msg = '' +
      'I have {numPeople, plural,' +
        'zero {zero points}' +
        'one {a point}' +
        'two {two points}' +
        'few {a few points}' +
        'many {lots of points}' +
        'other {some other amount of points}}' +
      '.';

    let msgFmt = null;

    before(() => {
      msgFmt = createComponents({ msgFmt: msg }, 'ar').msgFmt;
    });

    it('should match zero', () => {
      const output = render(msgFmt, { numPeople: 0 });
      assert.strictEqual(output, 'I have zero points.');
    });

    it('should match one', () => {
      const output = render(msgFmt, { numPeople: 1 });
      assert.strictEqual(output, 'I have a point.');
    });

    it('should match two', () => {
      const output = render(msgFmt, { numPeople: 2 });
      assert.strictEqual(output, 'I have two points.');
    });

    it('should match few', () => {
      const output = render(msgFmt, { numPeople: 5 });
      assert.strictEqual(output, 'I have a few points.');
    });

    it('should match many', () => {
      const output = render(msgFmt, { numPeople: 20 });
      assert.strictEqual(output, 'I have lots of points.');
    });

    it('should match other', () => {
      const output = render(msgFmt, { numPeople: 100 });
      assert.strictEqual(output, 'I have some other amount of points.');
    });
  });

  describe('with plural and select', function () {
    var simple = {
      en: '{NAME} went to {CITY}.',
      fr: '{NAME} est {GENDER, select, ' +
              'female {allée}' +
              'other {allé}}' +
          ' à {CITY}.'
    };

    var complex = {
      en: '{TRAVELLERS} went to {CITY}.',

      fr: '{TRAVELLERS} {TRAVELLER_COUNT, plural, ' +
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

    it('should format message en-US simple with different objects', function () {
      const { simpleEn } = createComponents({ simpleEn: simple.en }, 'en-US');
      assert.strictEqual(render(simpleEn, maleObj), 'Tony went to Paris.');
      assert.strictEqual(render(simpleEn, femaleObj), 'Jenny went to Paris.');
    });

    it('should format message fr-FR simple with different objects', function () {
      const { simpleFr } = createComponents({ simpleFr: simple.fr }, 'fr-FR');
      assert.strictEqual(render(simpleFr, maleObj), 'Tony est allé à Paris.');
      assert.strictEqual(render(simpleFr, femaleObj), 'Jenny est allée à Paris.');
    });

    it('should format message en-US complex with different objects', function () {
      const { complexEn } = createComponents({ complexEn: complex.en }, 'en-US');
      assert.strictEqual(render(complexEn, maleTravelers), 'Lucas, Tony and Drew went to Paris.');
      assert.strictEqual(render(complexEn, femaleTravelers), 'Monica went to Paris.');
    });

    it('should format message fr-FR complex with different objects', function () {
      const { complexFr } = createComponents({ complexFr: complex.fr }, 'fr-FR');
      assert.strictEqual(render(complexFr, maleTravelers), 'Lucas, Tony and Drew sont allés à Paris.');
      assert.strictEqual(render(complexFr, femaleTravelers), 'Monica est allée à Paris.');
    });
  });

  describe('and change the locale with different counts', function () {
    const messages = {
      en: '{COMPANY_COUNT, plural, ' +
            '=1 {One company}' +
            'other {# companies}}' +
        ' published new books.',

      ru: '{COMPANY_COUNT, plural, ' +
            '=1 {Одна компания опубликовала}' +
            'one {# компания опубликовала}' +
            'few {# компании опубликовали}' +
            'many {# компаний опубликовали}' +
            'other {# компаний опубликовали}}' +
        ' новые книги.'
    };

    it('should format a message with en-US locale', function () {
      const { msgFmt } = createComponents({ msgFmt: messages.en }, 'en-US');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 0 }), '0 companies published new books.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 1 }), 'One company published new books.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 2 }), '2 companies published new books.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 5 }), '5 companies published new books.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 10 }), '10 companies published new books.');
    });

    it('should format a message with ru-RU locale', function () {
      const { msgFmt } = createComponents({ msgFmt: messages.ru }, 'ru-RU');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 0 }), '0 компаний опубликовали новые книги.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 1 }), 'Одна компания опубликовала новые книги.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 2 }), '2 компании опубликовали новые книги.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 5 }), '5 компаний опубликовали новые книги.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 10 }), '10 компаний опубликовали новые книги.');
      assert.strictEqual(render(msgFmt, { COMPANY_COUNT: 21 }), '21 компания опубликовала новые книги.');
    });
  });

  describe('selectordinal arguments', function () {
    var msg = 'This is my {year, selectordinal, one{#st} two{#nd} few{#rd} other{#th}} birthday.';

    it('should use ordinal pluralization rules', function () {
      const { msgFmt } = createComponents({ msgFmt: msg }, 'en');
      assert.strictEqual(render(msgFmt, { year: 1 }), 'This is my 1st birthday.');
      assert.strictEqual(render(msgFmt, { year: 2 }), 'This is my 2nd birthday.');
      assert.strictEqual(render(msgFmt, { year: 3 }), 'This is my 3rd birthday.');
      assert.strictEqual(render(msgFmt, { year: 4 }), 'This is my 4th birthday.');
      assert.strictEqual(render(msgFmt, { year: 11 }), 'This is my 11th birthday.');
      assert.strictEqual(render(msgFmt, { year: 21 }), 'This is my 21st birthday.');
      assert.strictEqual(render(msgFmt, { year: 22 }), 'This is my 22nd birthday.');
      assert.strictEqual(render(msgFmt, { year: 33 }), 'This is my 33rd birthday.');
      assert.strictEqual(render(msgFmt, { year: 44 }), 'This is my 44th birthday.');
      assert.strictEqual(render(msgFmt, { year: 1024 }), 'This is my 1,024th birthday.');
    });
  });
});
