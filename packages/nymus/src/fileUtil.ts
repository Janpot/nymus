import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';

const fsStat = promisify(fs.stat);
const fsReaddir = promisify(fs.readdir);
const fsCopyFile = promisify(fs.copyFile);
const fsMkdir = promisify(fs.mkdir);
const fsRmdir = promisify(fs.rmdir);

export async function copyRecursive(src: string, dest: string) {
  const stats = await fsStat(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    try {
      await fsMkdir(dest);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    const entries = await fsReaddir(src);
    await Promise.all(
      entries.map(async (entry) => {
        await copyRecursive(path.join(src, entry), path.join(dest, entry));
      })
    );
  } else {
    await fsCopyFile(src, dest);
  }
}

export async function rmDirRecursive(src: string) {
  await fsRmdir(src, { recursive: true });
}

export async function fileExists(src: string) {
  try {
    await fsStat(src);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

interface TmpDir {
  path: string;
  cleanup: () => void;
}

export async function tmpDirFromTemplate(templayePath: string) {
  const result = await new Promise<TmpDir>((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (err, path, cleanup) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ path, cleanup });
    });
  });
  await copyRecursive(templayePath, result.path);
  return result;
}
