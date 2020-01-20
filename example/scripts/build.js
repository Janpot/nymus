const concurrently = require('concurrently');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const LOCALES = ['en', 'nl', 'fr'];

function getPort(i) {
  return PORT + 1 + i;
}

const rules = LOCALES.map((locale, i) => ({
  pathname: `/${locale}`,
  dest: `http://localhost:${getPort(i)}`
}));
fs.writeFileSync(
  path.resolve(__dirname, '../proxy.json'),
  JSON.stringify({ rules }, null, 2),
  { encoding: 'utf-8' }
);

const commands = LOCALES.map(
  (locale, i) => `LOCALE=${locale} LOCALES=${LOCALES.join(',')} next build`
);
concurrently(commands);
