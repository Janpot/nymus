import * as React from 'react';
import { Controlled as ReactCodeMirror } from 'react-codemirror2';
import { CM_THEME } from '../../constants';
import { SourceLocation } from '@babel/code-frame';

import CodeMirror from 'codemirror';
import icuMode from 'codemirror-mode-icu';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/addon/lint/lint';

export interface EditorError extends Error {
  location: SourceLocation;
}

interface EditorProps {
  mode?: 'icu' | 'jsx';
  stretch?: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  errors?: EditorError[];
}

interface HelperOptions {
  errors: EditorError[];
}

function linter(text: string, { errors = [] }: HelperOptions) {
  const editorHints = [];
  for (const error of errors) {
    const { location = { start: { line: 1 } } } = error;
    const {
      start,
      end = { ...start, column: start.column ? start.column + 1 : 1 }
    } = location;
    const startColumn = start.column ? start.column - 1 : 0;
    const endColumn = end.column ? end.column - 1 : 0;
    editorHints.push({
      message: error.message,
      severity: 'error',
      type: 'validation',
      from: CodeMirror.Pos(start.line - 1, startColumn),
      to: CodeMirror.Pos(end.line - 1, endColumn)
    });
  }
  return editorHints;
}

CodeMirror.registerHelper('lint', 'icu', linter);
CodeMirror.registerHelper('lint', 'javascript', linter);

export default function Editor({
  mode = 'icu',
  stretch,
  className,
  value,
  onChange,
  errors = []
}: EditorProps) {
  return (
    <ReactCodeMirror
      // @ts-ignore
      style={stretch ? { height: '100%' } : undefined}
      className={className}
      value={value}
      // @ts-ignore bad typing here
      defineMode={{ name: 'icu', fn: icuMode }}
      options={
        ({
          theme: CM_THEME,
          lineNumbers: true,
          mode,
          gutters: ['CodeMirror-lint-markers'],
          lint: {
            errors
          }
        } as unknown) as CodeMirror.EditorConfiguration
      }
      onBeforeChange={(editor, data, value) => {
        onChange(value);
      }}
      onChange={(editor, data, value) => {}}
    />
  );
}
