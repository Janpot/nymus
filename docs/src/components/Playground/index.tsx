import * as React from 'react';
import IcuEditor from './IcuEditor';
import Highlighter from './Highlighter';
import { formatError, createModuleAst } from 'nymus';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import * as Babel from '@babel/standalone';
import TsPlugin from '@babel/plugin-transform-typescript';
import CommonjsPlugin from '@babel/plugin-transform-modules-commonjs';
import JsxPlugin from '@babel/plugin-transform-react-jsx';
import Pane from './Pane';
import { format } from 'prettier/standalone';
import parserBabylon from 'prettier/parser-babylon';
import { Tabs, Tab } from '@material-ui/core';

async function createModule(input: { [key: string]: string }): Promise<string> {
  const ast = await createModuleAst(input, { typescript: true, react: true });
  const { code } = Babel.transformFromAst(ast, undefined, {
    generatorOpts: { concise: true }
  });
  return code || '';
}

function prettify(code: string): string {
  return format(code, {
    parser: 'babel',
    plugins: [parserBabylon]
  });
}

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row'
  },
  column: {
    overflow: 'auto',
    flex: 1,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  pane: {
    overflow: 'auto',
    flex: 1,
    flexShrink: 0,
    justifyItems: 'stretch'
  },
  editor: {
    height: '100%',
    '& .CodeMirror': {
      width: '100% !important',
      height: '100% !important'
    },
    '& .CodeMirror-scroll': {
      overflowX: 'auto',
      overflowY: 'hidden'
    }
  }
}));

const SAMPLE = `
{gender, select,
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

interface UsePLaygroundProps {
  icuInput: string;
  consumerInput: string;
}

function usePlayground({ icuInput, consumerInput }: UsePLaygroundProps) {
  const [generatedModule, setGeneratedModule] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const formatted = prettify(await createModule({ Component: icuInput }));
        setGeneratedModule(formatted);
      } catch (err) {
        setGeneratedModule(commentLines(formatError(icuInput, err)));
      }
    })();
  }, [icuInput]);

  const compiledModule = React.useMemo(() => {
    return Babel.transform(generatedModule, {
      plugins: [CommonjsPlugin, TsPlugin]
    }).code;
  }, [generatedModule]);

  const compiledConsumer = React.useMemo(() => {
    return Babel.transform(`return (${consumerInput});`, {
      plugins: [JsxPlugin],
      parserOpts: {
        allowReturnOutsideFunction: true
      }
    }).code;
  }, [consumerInput]);

  const renderedResult = React.useMemo(() => {
    const createComponent = eval(`
        (React) => {
          const {
            Component
          } = ((exports, require) => {
            ${compiledModule}
            return exports
          })({}, (module) => {
            if (module === 'react') {
              return React;
            } else {
              throw new Error(\`Unknown module "${module}"\`)
            }
          });
          if (Component) {
            return () => {
              ${compiledConsumer}
            };
          } else {
            return () => null
          }
        }
      `);
    const Component = createComponent(React);
    return React.createElement(Component);
  }, [compiledConsumer, compiledModule]);

  return {
    generatedModule,
    renderedResult
  };
}

type TabPanelProps = React.PropsWithChildren<{
  value: string;
  index: string;
}>;

const useTabPanelStyles = makeStyles({
  root: {},
  hidden: {
    display: 'none'
  }
});

function TabPanel({ value, index, children }: TabPanelProps) {
  const classes = useTabPanelStyles();
  return (
    <div className={clsx(classes.root, { [classes.hidden]: value !== index })}>
      {children}
    </div>
  );
}

export default function Playground({ className }: PlaygroundProps) {
  const classes = useStyles();

  const [icuTab, setIcuTab] = React.useState('icu');
  const [icuInput, setIcuInput] = React.useState<string>(SAMPLE.trim() + '\n');
  const [consumerInput, setConsumerInput] = React.useState<string>(
    '<Component gender="male" count={5} />\n'
  );

  const { generatedModule, renderedResult } = usePlayground({
    icuInput,
    consumerInput
  });

  function handleIcuTabChange(event: React.ChangeEvent<{}>, id: string) {
    setIcuTab(id);
  }

  return (
    <div className={clsx(classes.root, className)}>
      <div className={classes.column}>
        <Tabs value={icuTab} onChange={handleIcuTabChange}>
          <Tab value="icu" label="ICU message" />
          <Tab value="code" label="Generated code" />
        </Tabs>
        <TabPanel value={icuTab} index="icu">
          <IcuEditor
            className={classes.editor}
            value={icuInput}
            onChange={setIcuInput}
          />
        </TabPanel>
        <TabPanel value={icuTab} index="code">
          <Highlighter
            mode="jsx"
            className={classes.pane}
            value={generatedModule}
          />
        </TabPanel>
      </div>
      <div className={classes.column}>
        <Pane title="Consumer" className={classes.pane}>
          <IcuEditor
            mode="jsx"
            className={classes.editor}
            value={consumerInput}
            onChange={setConsumerInput}
          />
        </Pane>
        <Pane title="result" className={classes.pane}>
          {renderedResult}
        </Pane>
      </div>
    </div>
  );
}
