const execa = require('execa');
const { promises: fs } = require('fs');
const path = require('path');

const name = 'nymus-example';
const locales = ['en', 'fr', 'nl'];
const projectRoot = path.resolve(__dirname, '..');
const appPath = path.resolve(projectRoot, `app/`);

const prod = process.argv.includes('--prod');

if (prod) {
  console.log('Deploying to production');
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
  const entries = await fs.readdir(src);
  await Promise.all(
    entries.map(async entry => {
      if (!ignore.includes(entry)) {
        await fs.rmdir(path.join(src, entry), { recursive: true });
      }
    })
  );
}

async function deploy(folder) {
  const { stdout: url } = await execa(
    'now',
    ['deploy', '--no-clipboard', ...(prod ? ['--prod'] : []), folder],
    {
      cwd: __dirname,
      preferLocal: true
    }
  );
  return { url };
}

async function deployForLocale(locale) {
  const deploymentPath = path.resolve(projectRoot, `deployments/${locale}/`);
  const nowFolder = path.resolve(deploymentPath, `.now/`);
  const nowFolderBackup = path.resolve(projectRoot, `.now-${locale}-backup/`);

  await removeContent(deploymentPath, {
    ignore: ['.now', '.gitignore']
  });

  copyContent(appPath, deploymentPath, {
    ignore: ['.next', '.now', 'now.json', '.gitignore', 'node_modules']
  });

  const nowJsonPath = path.resolve(deploymentPath, 'now.json');
  await fs.writeFile(
    nowJsonPath,
    JSON.stringify(
      {
        build: {
          env: {
            LOCALE: locale,
            LOCALES: locales.join(',')
          }
        }
      },
      null,
      2
    ),
    { encoding: 'utf-8' }
  );

  console.log(`Deploying "${locale}"`);
  const { url } = await deploy(deploymentPath);
  console.log(`  => ${url}`);

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

    console.log(`Deploying default`);
    const { url } = await deploy(appPath);
    console.log(`  => ${url}`);
  } finally {
    await fs.writeFile(nowJsonPath, nowJsonContent, { encoding: 'utf-8' });
  }
}

process.on('unhandledRejection', err => {
  throw err;
});
main();
