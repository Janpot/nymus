<h1 align="center">nymus</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> Transform [ICU messages](http://userguide.icu-project.org/formatparse/messages) into React components.

`nymus` aims to generate components that look as if they were handwritten.

## Usage

### Example

```sh
npx nymus ./messages.json
```

given a `./messages.json` file:

```json
{
  "Welcome": "Hi there, {name}, how are you?"
}
```

`nymus` will generate a modules containing React components that can be readily imported in your project as follows:

```js
import * as React from 'react';
import { Welcome } from './messages';

export function HomePage() {
  return <Welcome name="John" />;
}
```

### Options

`--locale`, `-l` | Locale to be used in the `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.PluralRules` constructors.
`--typescript`, '-t' | Generate typescript files instead of javacsript files
`--declarations`, '-d' | Emit type declarations (.d.ts files)

## Author

👤 **Jan Potoms**

- Github: [@janpot](https://github.com/janpot)
