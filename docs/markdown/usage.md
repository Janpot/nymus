# Usage

## Installation

Install the `nymus` package with `npm`:

```sh
npm install --save-dev nymus
```

`typescript` is also needed if `.d.ts` files are to be generated.

## webpack

webpack can be configured to compile certain JSON files with `nymus` as follows:

```js
module.exports = {
  // ...
  module: {
    rules: [
      // ...
      {
        test: /\.json$/,
        include: [path.resolve(__dirname, './locales/')],
        type: 'javascript/auto',
        use: [
          {
            loader: 'nymus/webpack',
            options: { locale }
          }
        ]
      }
    ]
  }
};
```

## CLI

```sh
nymus [...options] [...files]
```

Use the `--help` option to get an overview of the [available options](/docs/configuration).

## API

```js
import createModule from 'nymus';

const MESSAGES = {
  Welcome: 'Hi there, {name}'
};

createModule(MESSAGES).then(({ code }) => console.log(code));
```
