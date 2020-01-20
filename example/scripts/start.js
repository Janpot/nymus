const concurrently = require('concurrently');

const LOCALES = ['en', 'nl', 'fr'];
const PORT = 3000;

function getPort(i) {
  return PORT + 1 + i;
}

const commands = LOCALES.map((locale, i) => {
  const port = getPort(i);
  return {
    command: `LOCALE=${locale} LOCALES=${LOCALES.join(
      ','
    )} next start -p ${port}`,
    name: `locale:${locale}`
  };
});

concurrently(
  [
    { command: `npm:proxy -s -- -r ./proxy.json -p ${PORT}`, name: 'proxy' },
    ...commands
  ],
  {
    killOthers: ['success', 'failure']
  }
);
