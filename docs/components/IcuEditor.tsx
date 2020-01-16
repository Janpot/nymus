import { Controlled as CodeMirror } from 'react-codemirror2';

import icuMode from 'codemirror-mode-icu';
import 'codemirror/mode/javascript/javascript';

interface IcuEditorProps {
  stretch?: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function IcuEditor({
  stretch,
  className,
  value,
  onChange
}: IcuEditorProps) {
  return (
    <CodeMirror
      style={stretch ? { height: '100%' } : undefined}
      className={className}
      value={value}
      // @ts-ignore bad typing here
      defineMode={{ name: 'icu', fn: icuMode }}
      options={{
        theme: 'material-darker',
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
