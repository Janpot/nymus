/* eslint-env jest */

import { Mode, defineMode, getMode, StringStream } from 'codemirror';
import modeFactory from './index';

defineMode('icu', modeFactory);
const mode = getMode({}, { name: 'icu', showInvisible: false });

type TokenResultArray = (string | null)[][];

function pushToken(resultTokens: TokenResultArray, token: string | null, current: string) {
  if (resultTokens.length <= 0) {
    resultTokens.push([current, token]);
  } else {
    const lastToken = resultTokens[resultTokens.length - 1];
    if (lastToken[1] === token) {
      lastToken[0] = lastToken[0] + current;
    } else {
      resultTokens.push([current, token]);
    }
  }
}

function testMode(mode: Mode<any>, str: string) {
  const state = mode.startState!();
  const lines = str.split('/n');
  const resultTokens: TokenResultArray = [];
  for (let lineNr = 0; lineNr < lines.length; lineNr++) {
    const stream = new StringStream(lines[lineNr]);
    while (!stream.eol()) {
      const token = mode.token!(stream, state);
      pushToken(resultTokens, token, stream.current());
      stream.start = stream.pos;
    }
  }
  return resultTokens;
}

function defineTest(name: string, mode: Mode<any>, input: (string[] | string)[], itFn = it) {
  itFn(name, () => {
    const langStr = input
      .map(token => {
        return typeof token === 'string' ? token : token[0];
      })
      .join('');
    const expectedTokens = input.map(token => {
      return typeof token === 'string' ? [token, null] : token;
    });
    const gotTokens = testMode(mode, langStr);
    expect(gotTokens).toEqual(expectedTokens);
  });
}

defineTest('simple string', mode, [['abc', 'string']]);

defineTest('simple argument', mode, [
  ['abc', 'string'],
  ['{', 'bracket'],
  ['def', 'def'],
  ['}', 'bracket'],
  ['ghi', 'string']
]);

defineTest('function argument', mode, [
  ['{', 'bracket'],
  ['def', 'def'],
  ',',
  ['select', 'keyword'],
  ['}', 'bracket']
]);

defineTest('function with whitespace', mode, [
  ['{', 'bracket'],
  ' ',
  ['xyz', 'def'],
  ' , ',
  ['select', 'keyword'],
  '  ',
  ['}', 'bracket']
]);

defineTest('function with format', mode, [
  ['{', 'bracket'],
  ['def', 'def'],
  ',',
  ['date', 'keyword'],
  ',',
  ['short', 'variable'],
  ['}', 'bracket']
]);

defineTest('no placeholder detection in top level string', mode, [
  ['ab#c', 'string']
]);

defineTest('ignore top level closing brace', mode, [['ab}c', 'string']]);

describe('escaped sequences', () => {
  function apostropheTests(mode: Mode<any>) {
    defineTest('accepts "Don\'\'t"', mode, [
      ['Don', 'string'],
      ["''", 'string-2'],
      ['t', 'string']
    ]);

    defineTest("starts quoting after '{", mode, [
      ['I see ', 'string'],
      ["'{many}'", 'string-2']
    ]);

    defineTest("starts quoting after '{", mode, [
      ['I ay ', 'string'],
      ["'{''wow''}'", 'string-2']
    ]);
  }

  const doubleOptionalMode = getMode(
    {},
    { name: 'icu', apostropheMode: 'DOUBLE_OPTIONAL', showInvisible: false }
  );
  const doubleRequiredMode = getMode(
    {},
    { name: 'icu', apostropheMode: 'DOUBLE_REQUIRED', showInvisible: false }
  );

  describe('apostropheMode:DOUBLE_OPTIONAL', () => {
    apostropheTests(doubleOptionalMode);

    defineTest('accepts "Don\'t" as a string', mode, [["Don't", 'string']]);

    defineTest('last character is quote', mode, [["a'", 'string']]);
  });

  describe('apostropheMode:DOUBLE_REQUIRED', () => {
    apostropheTests(doubleRequiredMode);

    defineTest('uses single quotes for escape', doubleRequiredMode, [
      ['ab', 'string'],
      ["'{'", 'string-2'],
      ['c', 'string']
    ]);

    defineTest('can escape in escaped sequence', doubleRequiredMode, [
      ['ab', 'string'],
      ["'c''d'", 'string-2'],
      ['e', 'string']
    ]);

    defineTest('can escape a quote', doubleRequiredMode, [
      ['ab', 'string'],
      ["''", 'string-2'],
      ['c', 'string']
    ]);

    defineTest('can on the next line', doubleRequiredMode, [
      ['ab', 'string'],
      ["'c\n'", 'string-2'],
      ['d', 'string']
    ]);

    defineTest('can on the next line and text', doubleRequiredMode, [
      ['ab', 'string'],
      ["'\nc'", 'string-2'],
      ['d', 'string']
    ]);

    defineTest('Starts escaping "Don\'t"', doubleRequiredMode, [
      ['Don', 'string'],
      ["'t", 'string-2']
    ]);

    defineTest('last character is quote', doubleRequiredMode, [
      ['a', 'string'],
      ["'", 'string-2']
    ]);
  });
});
