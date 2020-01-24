import * as React from 'react';
import IcuEditor from './IcuEditor';
import Highlighter from './Highlighter';
import { formatError } from 'nymus';
import { makeStyles } from '@material-ui/core/styles';
import transform from '../transform';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row'
  },
  pane: {
    overflow: 'auto',
    flex: 1,
    justifyItems: 'stretch'
  }
}));

const SAMPLE = `
{ gender, select,
  female {{
    count, plural,
       =0 {Ela não tem nenhum Pokémon}
      one {Ela tem só um Pokémon}
    other {Ela tem # Pokémon}
  }}
  other {{
    count, plural,
       =0 {Ele não tem nenhum Pokémon}
      one {Ele tem só um Pokémon}
    other {Ele tem # Pokémon}
  }}
}
`;

function commentLines(lines: string) {
  return lines
    .split('\n')
    .map(line => `// ${line}`)
    .join('\n');
}

interface PlaygroundProps {
  className?: string;
}

export default function Playground({ className }: PlaygroundProps) {
  const classes = useStyles();
  const [value, setValue] = React.useState(SAMPLE.trim() + '\n');
  const [result, setResult] = React.useState<string>();
  React.useEffect(() => {
    (async () => {
      try {
        const formatted = await transform({ Component: value });
        setResult(formatted);
      } catch (err) {
        setResult(commentLines(formatError(value, err)));
      }
    })();
  }, [value]);
  return (
    <div className={`${className || ''} ${classes.root}`}>
      <IcuEditor className={classes.pane} value={value} onChange={setValue} />
      <Highlighter mode="jsx" className={classes.pane} value={result} />
    </div>
  );
}
