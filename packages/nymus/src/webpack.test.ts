import path from 'path';
import webpack from 'webpack';
import { createFsFromVolume, Volume } from 'memfs';
import { copyRecursive, rmDirRecursive, fileExists } from './fileUtil';
import { join as pathJoin } from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const fsReadFile = promisify(fs.readFile);

const FIXTURES_DIR = path.resolve(__dirname, './__fixtures__/webpack');
const FIXTURES_BACKUP_DIR = path.resolve(
  __dirname,
  './__fixtures__/webpack.bak'
);

async function compile(fixture, options = {}): Promise<webpack.Stats> {
  const compiler = webpack({
    context: FIXTURES_DIR,
    entry: fixture,
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.json$/,
          type: 'javascript/auto',
          use: {
            loader: path.resolve(__dirname, '../webpack.js'),
            options
          }
        }
      ]
    }
  });

  compiler.outputFileSystem = Object.assign(createFsFromVolume(new Volume()), {
    join: pathJoin
  });

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err);
      if (stats.hasErrors()) reject(new Error(stats.toJson().errors[0]));
      resolve(stats);
    });
  });
}

describe('webpack', () => {
  function fixturePath(src: string) {
    return path.resolve(FIXTURES_DIR, src);
  }

  beforeAll(async () => {
    await copyRecursive(FIXTURES_DIR, FIXTURES_BACKUP_DIR);
  });

  afterEach(async () => {
    await rmDirRecursive(FIXTURES_DIR);
    await copyRecursive(FIXTURES_BACKUP_DIR, FIXTURES_DIR);
  });

  afterAll(async () => {
    await rmDirRecursive(FIXTURES_BACKUP_DIR);
  });

  it('should compile', async () => {
    const stats = await compile('./strings/en.json');
    const statsJson = stats.toJson();
    expect(statsJson.modules[0].source).toMatchInlineSnapshot(`
      "const message = function message() {
        return \\"Hello world\\";
      };

      export { message };"
    `);
    expect(await fileExists(fixturePath('./strings/en.json.d.ts'))).toBe(false);
  });

  it('should emit declarations', async () => {
    await compile('./strings/en.json', { declarations: true });
    expect(
      await fsReadFile(fixturePath('./strings/en.json.d.ts'), {
        encoding: 'utf-8'
      })
    ).toMatchInlineSnapshot(`
      "declare const message: () => string;
      export { message };
      "
    `);
  });
});
