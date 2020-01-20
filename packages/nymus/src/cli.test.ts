/* eslint-env jest */

import * as childProcess from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

function exec(command) {
  return new Promise((resolve, reject) => {
    childProcess.exec(
      command,
      { cwd: path.resolve(__dirname, './__fixtures__') },
      (error, stdout, stderr) => {
        resolve({
          code: error ? error.code : null,
          stdout: stdout.trim()
        });
      }
    );
  });
}

describe('cli', () => {
  it('should fail on invalid json', async () => {
    await expect(exec('nymus ./invalid/en.json')).resolves.toMatchObject({
      code: 1,
      stdout: `Unexpected end of JSON input`
    });
  });

  it('should fail on non existing json', async () => {
    await expect(exec('nymus ./non-existing/en.json')).resolves.toMatchObject({
      code: 1,
      stdout: expect.stringMatching(/^ENOENT: no such file or directory/)
    });
  });
});
