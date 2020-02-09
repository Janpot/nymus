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

async function deploy({ locale, prod }) {
  console.log(`Deploying "${locale}"`);
  const { stdout: url } = await execa(
    'now',
    [
      'deploy',
      '--no-clipboard',
      ...(prod ? ['--prod'] : []),
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

  const rewrites = [];
  for (const locale of locales) {
    const { url } = await deploy({ locale, prod: false });
    rewrites.push({
      source: `/${locale}(.*)`,
      destination: `${url}/${locale}$1`
    });
  }

  const nowJsonPath = path.resolve(projectRoot, 'now.json');
  const nowJsonContent = await fs.readFile(nowJsonPath, { encoding: 'utf-8' });
  const nowJson = JSON.parse(nowJsonContent);
  const overwrittenNowJson = {
    ...nowJson,
    rewrites: rewrites.concat(nowJson.rewrites || [])
  };

  try {
    await fs.writeFile(nowJsonPath, JSON.stringify(overwrittenNowJson), {
      encoding: 'utf-8'
    });
    await deploy({
      locale: DEFAULT_LOCALE,
      prod
    });
  } finally {
    await fs.writeFile(nowJsonPath, nowJsonContent, { encoding: 'utf-8' });
  }
}

process.on('unhandledRejection', err => {
  throw err;
});
main();
