import * as t from '@babel/types';
import * as babel from '@babel/core';
import { Formats } from './formats';
import { codeFrameColumns, BabelCodeFrameOptions } from '@babel/code-frame';
import Module from './Module';
import TsPlugin from '@babel/plugin-transform-typescript';

interface Messages {
  [key: string]: string;
}

export interface CreateModuleOptions {
  locale?: string;
  formats?: Partial<Formats>;
  ast?: boolean;
  react?: boolean;
  typescript?: boolean;
  declarations?: boolean;
}

interface Location {
  start: Position;
  end: Position;
}

interface Position {
  offset: number;
  line: number;
  column: number;
}

export function formatError(
  input: string,
  err: Error & { location?: Location; loc?: Position },
  options: Omit<BabelCodeFrameOptions, 'message'> = {}
): string {
  const location =
    err.location || (err.loc && { start: err.loc, end: err.loc });
  if (!location) {
    return err.message;
  }
  return codeFrameColumns(input, location, {
    ...options,
    message: err.message
  });
}

export async function createModuleAst(
  messages: Messages,
  options: CreateModuleOptions = {}
): Promise<t.Program> {
  const module = new Module(options);

  for (const [key, message] of Object.entries(messages)) {
    console.log(message);
    if (typeof message !== 'string') {
      throw new Error(`Invalid JSON, "${key}" is not a string`);
    }
    const componentName = t.toIdentifier(key);
    module.addMessage(componentName, message);
  }

  return t.program(module.buildModuleAst());
}

export default async function createModule(
  messages: Messages,
  options: CreateModuleOptions = {}
) {
  const tsAst = await createModuleAst(messages, options);

  let declarations: string | undefined;

  if (!options.typescript && options.declarations) {
    const { code } = babel.transformFromAstSync(tsAst) || {};
    if (!code) {
      throw new Error('Failed to generate code');
    }

    const ts = await import('typescript');

    const host = ts.createCompilerHost({});

    const readFile = host.readFile;
    host.readFile = (filename: string) => {
      return filename === 'messages.ts' ? code : readFile(filename);
    };

    host.writeFile = (fileName: string, contents: string) => {
      declarations = contents;
    };

    const program = ts.createProgram(
      ['messages.ts'],
      {
        noResolve: true,
        types: [],
        emitDeclarationOnly: true,
        declaration: true
      },
      host
    );
    program.emit();
  }

  const { code, ast } =
    (await babel.transformFromAstAsync(tsAst, undefined, {
      ast: options.ast,
      plugins: [...(options.typescript ? [] : [TsPlugin])]
    })) || {};

  if (!code) {
    throw new Error('Failed to generate code');
  }

  return {
    code,
    ast,
    declarations
  };
}
