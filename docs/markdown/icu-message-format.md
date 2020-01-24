# ICU MEssage format

Read [the formatjs.io guide](https://formatjs.io/guides/message-syntax/) to get familiar quickly with the syntax. `nymus` adds a few interesting features on top:

## JSX

`nymus` supports JSX tags inside strings. This is useful to inject extra behavior into messages.

```json
{
  "MoreInfo": "Find more information on <docsLink>our about page</docsLink>."
}
```

```jsx
<MoreInfo docsLink={({ children }) => <a href="/docs">{children}</a>} />
```

Self-closing tags are also supported:

```json
{
  "GitHub": "All of our code is hosted on <icon /> GitHub."
}
```

```jsx
<MoreInfo icon={GitHubIcon} />
```

Attributes are not allowed and `nymus` will throw an error if they are used.
