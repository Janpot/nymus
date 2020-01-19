/* eslint-env jest */

import { createReactComponent, renderReact } from './test-utils';

describe('ported intl-messageformat tests', () => {
  describe('using a string pattern', () => {
    it('should properly replace direct arguments in the string', async () => {
      const mf = await createReactComponent('My name is {FIRST} {LAST}.');
      const output = renderReact(mf, { FIRST: 'Anthony', LAST: 'Pipkin' });
      expect(output).toBe('My name is Anthony Pipkin.');
    });

    it('should not ignore zero values', async () => {
      const mf = await createReactComponent('I am {age} years old.');
      const output = renderReact(mf, { age: 0 });
      expect(output).toBe('I am 0 years old.');
    });

    it('should ignore false, null, and undefined', async () => {
      const mf = await createReactComponent('{a}{b}{c}');
      const output = renderReact(mf, {
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
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 0 });
      expect(output).toBe('I have zero points.');
    });

    it('should match one', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 1 });
      expect(output).toBe('I have a point.');
    });

    it('should match two', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 2 });
      expect(output).toBe('I have two points.');
    });

    it('should match few', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 5 });
      expect(output).toBe('I have a few points.');
    });

    it('should match many', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 20 });
      expect(output).toBe('I have lots of points.');
    });

    it('should match other', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'ar' });
      const output = renderReact(msgFmt, { numPeople: 100 });
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
      const simpleEn = await createReactComponent(simple.en, {
        locale: 'en-US'
      });
      expect(renderReact(simpleEn, maleObj)).toBe('Tony went to Paris.');
      expect(renderReact(simpleEn, femaleObj)).toBe('Jenny went to Paris.');
    });

    it('should format message fr-FR simple with different objects', async () => {
      const simpleFr = await createReactComponent(simple.fr, {
        locale: 'fr-FR'
      });
      expect(renderReact(simpleFr, maleObj)).toBe('Tony est allé à Paris.');
      expect(renderReact(simpleFr, femaleObj)).toBe('Jenny est allée à Paris.');
    });

    it('should format message en-US complex with different objects', async () => {
      const complexEn = await createReactComponent(complex.en, {
        locale: 'en-US'
      });
      expect(renderReact(complexEn, maleTravelers)).toBe(
        'Lucas, Tony and Drew went to Paris.'
      );
      expect(renderReact(complexEn, femaleTravelers)).toBe(
        'Monica went to Paris.'
      );
    });

    it('should format message fr-FR complex with different objects', async () => {
      const complexFr = await createReactComponent(complex.fr, {
        locale: 'fr-FR'
      });
      expect(renderReact(complexFr, maleTravelers)).toBe(
        'Lucas, Tony and Drew sont allés à Paris.'
      );
      expect(renderReact(complexFr, femaleTravelers)).toBe(
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
      const msgFmt = await createReactComponent(messages.en, {
        locale: 'en-US'
      });
      expect(renderReact(msgFmt, { COMPANY_COUNT: 0 })).toBe(
        '0 companies published new books.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 1 })).toBe(
        'One company published new books.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 2 })).toBe(
        '2 companies published new books.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 5 })).toBe(
        '5 companies published new books.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 10 })).toBe(
        '10 companies published new books.'
      );
    });

    it('should format a message with ru-RU locale', async () => {
      const msgFmt = await createReactComponent(messages.ru, {
        locale: 'ru-RU'
      });
      expect(renderReact(msgFmt, { COMPANY_COUNT: 0 })).toBe(
        '0 компаний опубликовали новые книги.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 1 })).toBe(
        'Одна компания опубликовала новые книги.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 2 })).toBe(
        '2 компании опубликовали новые книги.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 5 })).toBe(
        '5 компаний опубликовали новые книги.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 10 })).toBe(
        '10 компаний опубликовали новые книги.'
      );
      expect(renderReact(msgFmt, { COMPANY_COUNT: 21 })).toBe(
        '21 компания опубликовала новые книги.'
      );
    });
  });

  describe('selectordinal arguments', () => {
    var msg =
      'This is my {year, selectordinal, one{#st} two{#nd} few{#rd} other{#th}} birthday.';

    it('should use ordinal pluralization rules', async () => {
      const msgFmt = await createReactComponent(msg, { locale: 'en' });
      expect(renderReact(msgFmt, { year: 1 })).toBe('This is my 1st birthday.');
      expect(renderReact(msgFmt, { year: 2 })).toBe('This is my 2nd birthday.');
      expect(renderReact(msgFmt, { year: 3 })).toBe('This is my 3rd birthday.');
      expect(renderReact(msgFmt, { year: 4 })).toBe('This is my 4th birthday.');
      expect(renderReact(msgFmt, { year: 11 })).toBe(
        'This is my 11th birthday.'
      );
      expect(renderReact(msgFmt, { year: 21 })).toBe(
        'This is my 21st birthday.'
      );
      expect(renderReact(msgFmt, { year: 22 })).toBe(
        'This is my 22nd birthday.'
      );
      expect(renderReact(msgFmt, { year: 33 })).toBe(
        'This is my 33rd birthday.'
      );
      expect(renderReact(msgFmt, { year: 44 })).toBe(
        'This is my 44th birthday.'
      );
      expect(renderReact(msgFmt, { year: 1024 })).toBe(
        'This is my 1,024th birthday.'
      );
    });
  });
});
