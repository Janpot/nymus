const execa = require('execa');
const { promises: fs } = require('fs');
const path = require('path');

const name = 'nymus-example';
const defaultLocale = 'en';
const locales = ['en', 'fr', 'nl'];
const projectRoot = path.resolve(__dirname, '..');
const appPath = path.resolve(projectRoot, `app/`);

const prod = process.argv.includes('--prod');

if (prod) {
  console.log('Deploying to production');
} else {
  console.log('Run with --prod to deploy to production');
}

async function copyContent(src, dest, { ignore = [] } = {}) {
  const stats = await fs.stat(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    try {
      await fs.mkdir(dest);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    const entries = await fs.readdir(src);
    await Promise.all(
      entries.map(async entry => {
        if (!ignore.includes(entry)) {
          await copyContent(path.join(src, entry), path.join(dest, entry));
        }
      })
    );
  } else {
    await fs.copyFile(src, dest);
  }
}

async function removeContent(src, { ignore = [] } = {}) {
  let entries;
  try {
    entries = await fs.readdir(src);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
  await Promise.all(
    entries.map(async entry => {
      if (!ignore.includes(entry)) {
        await fs.rmdir(path.join(src, entry), { recursive: true });
      }
    })
  );
}

async function deploy(folder, locale = defaultLocale) {
  console.log(`Deploying "${locale}"`);
  const { stdout: url } = await execa(
    'now',
    [
      'deploy',
      '--no-clipboard',
      ...(prod ? ['--prod'] : []),
      '--build-env',
      `LOCALE=${locale}`,
      '--build-env',
      `LOCALES=${locales.join(',')}`,
      folder
    ],
    {
      cwd: __dirname,
      preferLocal: true
    }
  );
  console.log(`  => ${url}`);
  return { url };
}

async function deployForLocale(locale) {
  const deploymentPath = path.resolve(projectRoot, `deployments/${locale}/`);

  try {
    await fs.stat(path.resolve(deploymentPath));
  } catch (err) {
    await fs.mkdir(deploymentPath);
  }

  try {
    await fs.stat(path.resolve(deploymentPath, '.now'));
  } catch (err) {
    // deployment not set up
    // set it up first
    console.log(
      `Set up a project for "${locale}". Or link a project if you have one already for this locale.`
    );
    try {
      await execa('now', ['deploy', '--no-clipboard', deploymentPath], {
        stdin: 'inherit',
        stdout: 'inherit',
        cwd: __dirname,
        preferLocal: true
      });
    } catch (err) {
      // ignore
    }
  }

  await removeContent(deploymentPath, {
    ignore: ['.now', '.gitignore']
  });

  copyContent(appPath, deploymentPath, {
    ignore: ['.next', '.now', 'now.json', '.gitignore', 'node_modules']
  });

  const { url } = await deploy(deploymentPath, locale);

  return {
    rewrite: {
      source: `/${locale}(.*)`,
      destination: `${url}/${locale}$1`
    }
  };
}

async function main() {
  const rewrites = [];
  for (const locale of locales) {
    const { rewrite } = await deployForLocale(locale);
    rewrites.push(rewrite);
  }

  const nowJsonPath = path.resolve(appPath, 'now.json');
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
    await deploy(appPath, defaultLocale);
  } finally {
    await fs.writeFile(nowJsonPath, nowJsonContent, { encoding: 'utf-8' });
  }
}

process.on('unhandledRejection', err => {
  throw err;
});
main();
