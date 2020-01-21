<h1 align="center">nymus 🦁</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> Transform [ICU messages](http://userguide.icu-project.org/formatparse/messages) into React components.

## Usage

### Example

```sh
npx nymus ./messages.json
```

given a `./messages.json` file:

```json
{
  "Welcome": "It's {name}, {gender, select, male {his} female {her} other {their}} birthday is {birthday, date, long}"
}
```

`nymus` will generate a module containing React components that can be readily imported in your project as follows:

```js
import * as React from 'react';
import { Welcome } from './messages';

export function HomePage() {
  return <Welcome name="John" gender="male" birthday={new Date(1985, 11, 3)} />;
}
```

### Options

Option | Description
--- | ---
`--locale`, `-l` | Locale to be used in the `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.PluralRules` constructors.
`--typescript`, '-t' | Generate typescript files instead of javacsript files
`--declarations`, '-d' | Emit type declarations (.d.ts files)

## Author

👤 **Jan Potoms**

- Github: [@janpot](https://github.com/janpot)
