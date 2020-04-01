const concurrently = require('concurrently');

const LOCALES = ['en', 'nl', 'fr'];
const PORT = 3000;

function getPort(i) {
  return PORT + 1 + i;
}

async function main() {
  const commands = LOCALES.map((locale, i) => {
    const port = getPort(i);
    const locales = LOCALES.join(',');
    return {
      command: `LOCALE=${locale} LOCALES=${locales} next start -p ${port}`,
      name: `start:${locale}`,
    };
  });

  await concurrently(
    [
      {
        command: `micro-proxy -r ./.next/rules.json -p ${PORT}`,
        name: 'proxy',
      },
      ...commands,
    ],
    {
      killOthers: ['success', 'failure'],
    }
  );
}

process.on('unhandledRejection', (err) => {
  throw err;
});
main();
