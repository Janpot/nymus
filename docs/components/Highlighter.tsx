import 'codemirror/mode/jsx/jsx';
import React from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';

interface HighlighterProps {
  className?: string;
  inline?: boolean;
  value?: string;
}

export default function Highlighter({
  className,
  value = '',
  inline
}: HighlighterProps) {
  return (
    <CodeMirror
      className={className}
      value={value}
      options={{
        theme: 'material-darker',
        lineNumbers: true,
        mode: 'jsx',
        readOnly: 'nocursor'
      }}
      onBeforeChange={() => {
        console.log('dkhlij');
      }}
    />
  );
}
