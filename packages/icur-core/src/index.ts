import * as t from '@babel/types';
import generate from '@babel/generator';
import { Formats } from './icu-to-react-component';
import { codeFrameColumns, BabelCodeFrameOptions } from '@babel/code-frame';
import Module from './Module';

interface Messages {
  [key: string]: string;
}

export interface IcurOptions {
  locale?: string;
  formats?: Partial<Formats>;
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
  options?: BabelCodeFrameOptions
): string {
  const location =
    err.location || (err.loc && { start: err.loc, end: err.loc });
  if (!location) {
    return err.message;
  }
  return codeFrameColumns(input, location, {
    message: err.message
  });
}

export default function createModule(
  messages: Messages,
  options: IcurOptions = {}
) {
  const module = new Module(options);

  for (const [key, message] of Object.entries(messages)) {
    const componentName = t.toIdentifier(key);
    module.addMessage(componentName, message);
  }

  const program = t.program(module.buildModuleAst());

  return {
    code: generate(program).code,
    ast: program
  };
}
