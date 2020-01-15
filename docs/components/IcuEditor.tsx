import { Controlled as CodeMirror } from 'react-codemirror2';

import icuMode from 'codemirror-mode-icu';
import 'codemirror/mode/javascript/javascript';

interface IcuEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IcuEditor({ value, onChange }: IcuEditorProps) {
  return (
    <CodeMirror
      value={value}
      // @ts-ignore bad typing here
      defineMode={{ name: 'icu', fn: icuMode }}
      options={{
        theme: 'material',
        lineNumbers: true,
        mode: 'icu'
      }}
      onBeforeChange={(editor, data, value) => {
        onChange(value);
      }}
      onChange={(editor, data, value) => {}}
    />
  );
}
