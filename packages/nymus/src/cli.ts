import * as yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import createModule, { CreateModuleOptions } from './index';
import { promisify } from 'util';

const fsStat = promisify(fs.stat);
const fsReaddir = promisify(fs.readdir);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);

const { argv } = yargs
    .usage('Usage: $0 [options] [file...]')
    .example('$0 --locale en ./string-en.json', '')
    .option('locale', {
      type: 'string',
      description: 'The locale to use for formatters',
      alias: 'l',
      requiresArg: true
    })
    .option('typescript', {
      type: 'boolean',
      description: 'Emit typescript instead of javascript',
      alias: 't'
    })
    .option('declarations', {
      type: 'boolean',
      description: 'Emit type declarations (.d.ts)',
      alias: 'd'
    }) /*
  .option('output-dir', {
    type: 'string',
    description: 'The directory where transformed files should be stored',
    alias: 'o'
  })
  .option('source-root', {
    type: 'string',
    description:
      'The directory where the source files are considered relative from'
  }) */;

async function resolveFiles(inputs: string[]): Promise<string[]> {
  const result: string[] = [];
  await Promise.all(
    inputs.map(async input => {
      const resolvedPath = path.resolve(process.cwd(), input);
      const stat = await fsStat(resolvedPath);
      if (stat.isDirectory()) {
        const entries = await fsReaddir(resolvedPath);
        result.push(...entries.map(entry => path.resolve(resolvedPath, entry)));
      } else {
        result.push(resolvedPath);
      }
    })
  );
  return result;
}

function getOutputDirectory(srcPath: string): string {
  return path.dirname(srcPath);
}

async function transformFile(srcPath: string, options: CreateModuleOptions) {
  const content = await fsReadFile(srcPath, { encoding: 'utf-8' });
  const messages = JSON.parse(content);
  const { code, declarations } = await createModule(messages, options);
  return { code, declarations };
}

async function main() {
  const resolvedFiles = await resolveFiles(argv._);
  if (resolvedFiles.length <= 0) {
    throw new Error('missing input');
  }
  await Promise.all(
    resolvedFiles.map(async resolvedFile => {
      const { code, declarations } = await transformFile(resolvedFile, {
        ...argv,
        // force this for now
        react: true
      });
      const outputDirectory = getOutputDirectory(resolvedFile);
      const fileName = path.basename(resolvedFile);
      const extension = path.extname(resolvedFile);
      const fileBaseName =
        extension.length <= 0 ? fileName : fileName.slice(0, -extension.length);
      const outputExtension = argv.typescript ? '.ts' : '.js';
      const outputPath = path.join(
        outputDirectory,
        fileBaseName + outputExtension
      );
      const declarationsPath = path.join(
        outputDirectory,
        fileBaseName + '.d.ts'
      );
      await Promise.all([
        fsWriteFile(outputPath, code, { encoding: 'utf-8' }),
        declarations
          ? fsWriteFile(declarationsPath, declarations, { encoding: 'utf-8' })
          : null
      ]);
    })
  );
}

main().catch(error => {
  console.log(error.message);
  process.exit(1);
});
