import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const fsStat = promisify(fs.stat);
const fsReaddir = promisify(fs.readdir);
const fsCopyFile = promisify(fs.copyFile);
const fsMkdir = promisify(fs.mkdir);
const fsRmdir = promisify(fs.rmdir);

export async function copyRecursive(src: string, dest: string) {
  const stats = await fsStat(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    await fsMkdir(dest);
    const entries = await fsReaddir(src);
    await Promise.all(
      entries.map(async entry => {
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
