const execa = require('execa');
const { promises: fs } = require('fs');
const path = require('path');

const DEFAULT_LOCALE = 'en';

const projectRoot = path.resolve(__dirname, '..');
const localesFolder = path.resolve(projectRoot, './locales/');

const prod = process.argv.includes('--prod');

if (prod) {
  console.log('Deploying to production');
} else {
  console.log('Run with --prod to deploy to production');
}

async function deploy({ locale, prod = false, urls = {} }) {
  const buildEnvParams = [];
  for (const [urlLocale, localeUrl] of Object.entries(urls)) {
    buildEnvParams.push('--build-env', `LOCALE_URL_${urlLocale}=${localeUrl}`);
  }
  console.log(`Deploying "${locale}"`);
  const { stdout: url } = await execa(
    'now',
    [
      'deploy',
      '--no-clipboard',
      ...(prod ? ['--prod'] : []),
      ...buildEnvParams,
      '--build-env',
      `LOCALE=${locale}`,
      '--meta',
      `locale=${locale}`,
      projectRoot
    ],
    {
      cwd: __dirname,
      preferLocal: true
    }
  );
  console.log(`  => ${url}`);
  return { url };
}

async function main() {
  try {
    await fs.stat(path.resolve(projectRoot, '.now'));
  } catch (err) {
    // deployment not set up
    // set it up first
    await execa('now', ['deploy', '--no-clipboard', deploymentPath], {
      stdio: 'inherit',
      cwd: __dirname,
      preferLocal: true
    });
  }

  const locales = await fs.readdir(localesFolder);

  const urls = {};
  for (const locale of locales) {
    const { url } = await deploy({ locale, prod: false });
    urls[locale] = url;
  }

  await deploy({
    locale: DEFAULT_LOCALE,
    prod,
    urls
  });
}

process.on('unhandledRejection', err => {
  throw err;
});
main();
