import * as React from 'react';
import IcuEditor from './IcuEditor';
import Highlighter from './Highlighter';
import createModule, { formatError } from 'nymus';
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

const SAMPLE = `
Hello there  mr. {name}, how are you?

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
}`;
/* const SAMPLE = `
Hello there  mr. {name}, how are you?

Quote '{' to escape '}' or Don''t

{gender_of_host, select,
  female {
	  {num_guests, plural, offset:1
      =0 {{host} does not give a party.}
      =1 {{host} invites {guest} to her party.}
      =2 {{host} invites {guest} and one other person to her party.}
      other {{host} invites {guest} and # other people to her party.}}}
  male {
	  {num_guests, plural, offset:1
      =0 {{host} does not give a party.}
      =1 {{host} invites {guest} to his party.}
      =2 {{host} invites {guest} and one other person to his party.}
      other {{host} invites {guest} and # other people to his party.}}}
  other {
	  {num_guests, plural, offset:1
      =0 {{host} does not give a party.}
      =1 {{host} invites {guest} to their party.}
      =2 {{host} invites {guest} and one other person to their party.}
      other {{host} invites {guest} and # other people to their party.}}}}

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

Trainers: { count, number }

Caught on { catchDate, date, short }

{ trainers, plural, offset:1
   =0 {The gym is empty}
   =1 {You are alone here}
  one {You and # trainer}
other {You and # trainers} }`; */

function commentLines(lines: string) {
  return lines
    .split('\n')
    .map(line => `// ${line}`)
    .join('\n');
}

export default function Playground() {
  const classes = useStyles();
  const [value, setValue] = React.useState(SAMPLE);
  const [result, setResult] = React.useState<string>();
  React.useEffect(() => {
    (async () => {
      try {
        const { code } = await createModule(
          { Component: value },
          { typescript: true, react: true }
        );
        const formatted = format(code, {
          parser: 'babel',
          plugins: [parserBabylon]
        });
        setResult(formatted);
      } catch (err) {
        setResult(commentLines(formatError(value, err)));
      }
    })();
  }, [value]);
  return (
    <div className={classes.root}>
      <IcuEditor className={classes.pane} value={value} onChange={setValue} />
      <Highlighter className={classes.pane} value={result} />
    </div>
  );
}
