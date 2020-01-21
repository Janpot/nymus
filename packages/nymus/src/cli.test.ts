/* eslint-env jest */

import * as childProcess from 'child_process';
import * as path from 'path';
import { copyRecursive, rmDirRecursive, fileExists } from './fileUtil';

const FIXTURES_DIR = path.resolve(__dirname, './__fixtures__/cli');
const FIXTURES_BACKUP_DIR = path.resolve(__dirname, './__fixtures__/cli.bak');

function exec(command) {
  return new Promise(resolve => {
    childProcess.exec(command, { cwd: FIXTURES_DIR }, (error, stdout) => {
      resolve({
        code: error ? error.code : null,
        stdout: stdout.trim()
      });
    });
  });
}

describe('cli', () => {
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

  it('should fail on invalid json', async () => {
    await expect(exec('nymus ./invalid/en.json')).resolves.toMatchObject({
      code: 1,
      stdout: `Unexpected end of JSON input`
    });
  });

  it('should compile a folder', async () => {
    await exec('nymus ./strings/');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(true);
  });

  it('should compile individual files', async () => {
    await exec('nymus ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(false);
  });

  it('should compile glob patterns', async () => {
    await exec('nymus ./strings/{en,fr}.json');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(true);
  });

  it('should only compile javascript when no configuration', async () => {
    await exec('nymus ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(false);
  });

  it('should compile declarations when configured', async () => {
    await exec('nymus -d ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(true);
  });

  it('should compile typescript when configured', async () => {
    await exec('nymus -t ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(false);
  });
});
