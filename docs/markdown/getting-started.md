# Getting Started

Define ICU messages in a JSON file:

```json
{
  "WelcomeMessage": "Hi there, {name}. Welcome to {place}.",
  "Notification": "You have {count, plural, one {a notification} other {# notifications}}",
  "Copyright": "© {date, date} {organization}"
}
```

Run the `nymus` CLI to generate components:

```sh
nymus --locale en ./en/strings.json
```

Import the components in your project:

```js
import { WelcomeMessage } from './en/strings';
```

Use the generated component:

```jsx
<WelcomeMessage name="Johnny" place="the nymus docs" />
```

## Examples

Take alook at the examples to get an idea of how a complete setup would work

- [with next.js](https://github.com/Janpot/nymus/tree/master/examples/next.js)
