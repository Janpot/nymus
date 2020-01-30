/* eslint-env jest */

import path from 'path';
import webpack from 'webpack';
import { createFsFromVolume, Volume } from 'memfs';
import { fileExists, tmpDirFromTemplate } from './fileUtil';
import { join as pathJoin } from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const fsReadFile = promisify(fs.readFile);

async function compile(context, fixture, options = {}): Promise<webpack.Stats> {
  const compiler = webpack({
    context,
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
  let fixtureDir;

  function fixturePath(src: string) {
    return path.resolve(fixtureDir.path, src);
  }

  beforeEach(async () => {
    fixtureDir = await tmpDirFromTemplate(
      path.resolve(__dirname, './__fixtures__')
    );
  });

  afterEach(() => {
    fixtureDir.cleanup();
  });

  it('should compile', async () => {
    const stats = await compile(fixtureDir.path, './strings/en.json');
    const statsJson = stats.toJson();
    expect(statsJson.modules[0].source).toMatchInlineSnapshot(`
      "function message() {
        return \\"Hello world\\";
      }

      export { message };"
    `);
    expect(await fileExists(fixturePath('./strings/en.json.d.ts'))).toBe(false);
  });

  it('should emit declarations', async () => {
    await compile(fixtureDir.path, './strings/en.json', { declarations: true });
    expect(
      await fsReadFile(fixturePath('./strings/en.json.d.ts'), {
        encoding: 'utf-8'
      })
    ).toMatchInlineSnapshot(`
      "declare function message(): string;
      export { message };
      "
    `);
  });
});
