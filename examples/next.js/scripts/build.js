const concurrently = require('concurrently');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fsWriteFile = promisify(fs.writeFile);

const PORT = 3000;
const LOCALES = ['en', 'nl', 'fr'];

function getPort(i) {
  return PORT + 1 + i;
}

async function buildProxyRules() {
  const rules = LOCALES.map((locale, i) => ({
    pathname: `/${locale}`,
    dest: `http://localhost:${getPort(i)}`,
  }));

  await fsWriteFile(
    path.resolve(__dirname, '../.next/rules.json'),
    JSON.stringify({ rules }, null, 2),
    { encoding: 'utf-8' }
  );
}

async function buildNext() {
  const commands = LOCALES.map((locale, i) => ({
    name: `build:${locale}`,
    command: `LOCALE=${locale} LOCALES=${LOCALES.join(',')} next build`,
  }));
  await concurrently(commands);
}

async function main() {
  await Promise.all([buildProxyRules(), buildNext()]);
}

process.on('unhandledRejection', (err) => {
  throw err;
});
main();
