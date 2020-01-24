# configuration

`nymus` can be configured to your needs

## locale

Configures the locale to be used for the `Intl.*` formatters and pluralrules. The locale is directly inserted in the constructor of these objectes. e.g.

```sh
nymus --locale ru ./ru/strings.json
```

By using the `--locale` option, the generated components will use formatters that are constructed like so:

```js
const numberFormat = new Intl.NumberFormat('ru');
```

## typescript

Emit typescript files instead of javascript

```sh
nymus --typescript ./strings.json
```

This will result in the creaton of a `.ts` file `./strings.ts` containing typed components for the strings in `./strings.json`.

## `declarations`

Emit `.d.ts` declaration files next to the messageformat files.

```sh
nymus --declarations ./strings.json
```

This will result in the creaton of a `.d.ts` file `./strings.d.ts` containing declarations for the componets in `./strings.js`.

**Important!:** `nymus` only has a `peerDependency` on `typescript`. In order for this function to work, a `typescript` compiler needs to be installed in your project.
