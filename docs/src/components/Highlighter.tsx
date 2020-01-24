import 'codemirror/mode/jsx/jsx';
import React from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import icuMode from 'codemirror-mode-icu';
import { CM_THEME } from '../constants';

interface HighlighterProps {
  mode: 'icu' | 'jsx';
  className?: string;
  value?: string;
}

export default function Highlighter({
  className,
  value = '',
  mode = 'jsx'
}: HighlighterProps) {
  return (
    <CodeMirror
      className={className}
      value={value}
      // @ts-ignore bad typing here
      defineMode={{ name: 'icu', fn: icuMode }}
      options={{
        theme: CM_THEME,
        lineNumbers: true,
        mode,
        readOnly: 'nocursor'
      }}
      onBeforeChange={() => {
        console.log('dkhlij');
      }}
    />
  );
}
