<h1 align="center"><a href="https://nymus.now.sh/">🦉 nymus</a></h1>
<p>
  <a href="http://npmjs.com/package/nymus">
    <img alt="Version" src="https://img.shields.io/npm/v/nymus" />
  </a>
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://github.com/Janpot/nymus/actions">
    <img alt="nymus test status" src="https://img.shields.io/github/workflow/status/Janpot/nymus/nymus%20tests">
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

## Documentation

- [playground](https://nymus.now.sh/playground)
- [documentation](https://nymus.now.sh/docs)

## Author

👤 **Jan Potoms**

- Github: [@janpot](https://github.com/janpot)
