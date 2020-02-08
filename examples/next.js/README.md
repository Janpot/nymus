# Example

## Summary

This example will run three instances of the same next.js app on 3 different base paths. It will alias a different locale folder for each of the three instances. It will also provide localized messages as React components, compiled by `nymus`.

The next app is made configurable through environment variables, which are read in `next.config.js`. Based on a `LOCALE` variable it alters:

1. the build directory, so the different instances don't overwrite each other
2. the `basePath` (experimental feature)
3. a webpack alias to `@locale` that points to a locale folder under `./locales/`

It also adds `nymus/webpack` to load the localized string.

## Develop

Now the app can be started by running

```
yarn dev
```

then visit `http://localhost:3000/en`

## Deploy to `now`

The app can be deployed to `now` with the command

```
yarn deploy
```

You'll be required to set up a now project for each locale, this script will prompt you to create or link those. It will then deploy each locale and set up the necessary rewrites.
