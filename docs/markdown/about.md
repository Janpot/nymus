# About `nymus`

## Philosophy

I strongly believe that the internationalization of an application should impose as little runtime overhead as possible. this means that:

1. No more message strings should be loaded than are being used by any given javascript bundle.
2. No more parsing or transformation should be needed before a string can be used as compared to a hand-written component.

To achieve the first criterium, `nymus` relies on [tree-shaking](https://webpack.js.org/guides/tree-shaking/). It will generate tree-shakeable component files in ES6 module format. It relies on existing javascript tools, like webpack, to eliminate unused code from the bundles.

To achieve the second criterium, `nymus` will translate each ICU message into a highly optimized React component. All parsing is done at build time, and the component generates strings with just string templateng. To illustrate:

```json
{
  "Message": "Hello there, {name}, your score is {score, number, percent}."
}
```

Should result into code equivalent to

```js
const number = new Intl.NumberFormat('en', { style: 'percent' });
export function Message({ name, score }) {
  return `Hello there, ${name}, your score is ${number.format(score)}.`;
}
```

To get an idea of how `nymus` translates messages, head over to [the playground](/playground) to try it for yourself.

## Acknowledgements

This project wouldn't be possible without the following libraries:

- [formatjs](https://formatjs.io/github/)
- [typecript](https://www.typescriptlang.org/)
- [babel](https://babeljs.io/)
