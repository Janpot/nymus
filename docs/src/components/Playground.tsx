import * as React from 'react';
import IcuEditor from './IcuEditor';
import Highlighter from './Highlighter';
import icur, { formatError } from '@icur/core';
import { format } from 'prettier/standalone';
import parserBabylon from 'prettier/parser-babylon';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    padding: theme.spacing(1)
  },
  pane: {
    overflow: 'auto',
    margin: theme.spacing(1),
    flex: 1,
    justifyItems: 'stretch'
  }
}));

const SAMPLE = `Hello there  mr. {name}, how are you?`;

function commentLines(lines: string) {
  return lines
    .split('\n')
    .map(line => `// ${line}`)
    .join('\n');
}

export default function Playground() {
  const classes = useStyles();
  const [value, setValue] = React.useState(SAMPLE);
  const result: string = React.useMemo(() => {
    try {
      const { code } = icur({ Component: value });
      const formatted = format(code, {
        parser: 'babel',
        plugins: [parserBabylon]
      });
      return formatted;
    } catch (err) {
      return commentLines(formatError(value, err));
    }
  }, [value]);
  return (
    <div className={classes.root}>
      <IcuEditor className={classes.pane} value={value} onChange={setValue} />
      <Highlighter className={classes.pane} value={result} />
    </div>
  );
}
