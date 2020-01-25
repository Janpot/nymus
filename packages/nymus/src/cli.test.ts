/* eslint-env jest */

import * as childProcess from 'child_process';
import * as path from 'path';
import { tmpDirFromTemplate, fileExists } from './fileUtil';

function exec(cwd: string, command: string) {
  return new Promise(resolve => {
    childProcess.exec(command, { cwd }, (error, stdout) => {
      resolve({
        code: error ? error.code : null,
        stdout: stdout.trim()
      });
    });
  });
}

describe('cli', () => {
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

  it('should fail on invalid json', async () => {
    await expect(
      exec(fixtureDir.path, 'nymus ./invalid-json.json')
    ).resolves.toMatchObject({
      code: 1,
      stdout: `Unexpected end of JSON input`
    });
  });

  it('should fail on invalid message', async () => {
    await expect(
      exec(fixtureDir.path, 'nymus ./invalid-message.json')
    ).resolves.toMatchObject({
      code: 1,
      stdout: `Invalid JSON, "message" is not a string`
    });
  });

  it('should compile a folder', async () => {
    await exec(fixtureDir.path, 'nymus ./strings/');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(true);
  });

  it('should compile individual files', async () => {
    await exec(fixtureDir.path, 'nymus ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(false);
  });

  it('should compile glob patterns', async () => {
    await exec(fixtureDir.path, 'nymus ./strings/{en,fr}.json');
    expect(await fileExists(fixturePath('./strings/en.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/fr.js'))).toBe(true);
  });

  it('should only compile javascript when no configuration', async () => {
    await exec(fixtureDir.path, 'nymus ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(false);
  });

  it('should compile declarations when configured', async () => {
    await exec(fixtureDir.path, 'nymus -d ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(true);
  });

  it('should compile typescript when configured', async () => {
    await exec(fixtureDir.path, 'nymus -t ./strings/nl.json');
    expect(await fileExists(fixturePath('./strings/nl.js'))).toBe(false);
    expect(await fileExists(fixturePath('./strings/nl.ts'))).toBe(true);
    expect(await fileExists(fixturePath('./strings/nl.d.ts'))).toBe(false);
  });
});
