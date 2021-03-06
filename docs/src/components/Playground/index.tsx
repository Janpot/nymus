import * as React from 'react';
import Editor, { EditorError } from './Editor';
import { formatError, createModuleAst } from 'nymus';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import * as Babel from '@babel/standalone';
import TsPlugin from '@babel/plugin-transform-typescript';
import CommonjsPlugin from '@babel/plugin-transform-modules-commonjs';
import JsxPlugin from '@babel/plugin-transform-react-jsx';
import { format } from 'prettier/standalone';
import babelParser from 'prettier/parser-babel';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CodeIcon from '@material-ui/icons/Code';
import { SourceLocation } from '@babel/code-frame';
import CodeDialog from './CodeDialog';

const COMPONENT_NAME = 'Message';

async function createModule(input: { [key: string]: string }): Promise<string> {
  const ast = await createModuleAst(input, { typescript: true, react: true });
  const { code } = Babel.transformFromAst(ast, undefined, {
    generatorOpts: { concise: true },
  });
  return code || '';
}

function prettify(code: string): string {
  return format(code, {
    parser: 'babel',
    plugins: [babelParser],
  });
}

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    padding: theme.spacing(1),
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    height: '50%',
    display: 'flex',
    flexDirection: 'column',
  },
  pane: {
    margin: theme.spacing(1),
  },
  paper: {
    display: 'flex',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  editor: {
    flex: 1,
    position: 'relative',
    '& .CodeMirror': {
      position: 'absolute',
      width: '100% !important',
      height: '100% !important',
    },
  },
  paneTitle: {
    flex: 1,
  },
  renderResultContainer: {
    overflow: 'scroll',
  },
  renderResult: {
    padding: theme.spacing(3),
  },
  error: {
    height: '100%',
    color: theme.palette.error.dark,
  },
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
}`;

function toEditorError(
  error: Error & { loc?: SourceLocation; location?: SourceLocation }
): EditorError {
  // babel standalone does weird things with locations
  const location = error.location
    ? error.location
    : error.loc
    ? error.loc.start
      ? error.loc
      : { start: error.loc }
    : { start: { line: 1 } };
  return Object.assign(error, { location });
}

function commentLines(lines: string) {
  return lines
    .split('\n')
    .map((line) => `// ${line}`)
    .join('\n');
}

interface RendererErrorProps {
  error: Error;
}

function RendererError({ error }: RendererErrorProps) {
  const classes = useStyles();
  return <div className={classes.error}>{error.message}</div>;
}

interface UsePLaygroundProps {
  icuInput: string;
  consumerInput: string;
}

// simplest module loader in the world
function createRequire(
  modules: { [key: string]: string },
  moduleInstances: { [key: string]: any } = {}
) {
  const require = (moduleId: string) => {
    if (moduleInstances[moduleId]) {
      return moduleInstances[moduleId];
    }
    if (!modules[moduleId]) {
      throw new Error(`Unknown module "${moduleId}"`);
    }
    const exports = {};
    moduleInstances[moduleId] = exports;
    eval(`(exports, require) => {
      ${modules[moduleId]}
    }`)(exports, require);
    return exports;
  };
  return require;
}

function usePlayground({ icuInput, consumerInput }: UsePLaygroundProps) {
  const [generatedModule, setGeneratedModule] = React.useState<{
    code: string;
    compiled: string | null;
    errors: Error[];
  }>({
    code: '',
    compiled: null,
    errors: [],
  });

  React.useEffect(() => {
    (async () => {
      try {
        const formatted = prettify(
          await createModule({ [COMPONENT_NAME]: icuInput })
        );
        const { code: compiled = null } = Babel.transform(formatted, {
          plugins: [CommonjsPlugin, TsPlugin],
        });
        setGeneratedModule({
          errors: [],
          code: formatted,
          compiled,
        });
      } catch (error) {
        setGeneratedModule({
          errors: [error],
          code: commentLines(formatError(icuInput, error)),
          compiled: null,
        });
      }
    })();
  }, [icuInput]);

  const consumerModule = React.useMemo<{
    errors: EditorError[];
    code: string;
    compiled: string | null;
  }>(() => {
    try {
      const { code } = Babel.transform(consumerInput, {
        plugins: [CommonjsPlugin, JsxPlugin],
      });
      return {
        errors: [],
        code: consumerInput,
        compiled: code || null,
      };
    } catch (error) {
      const { line, column } = error.loc;
      const location = {
        start: { line, column: line === 1 ? column - 7 : column },
      };
      return {
        errors: [Object.assign(error as Error, { location })],
        code: consumerInput,
        compiled: null,
      };
    }
  }, [consumerInput]);

  const renderedResult = React.useMemo(() => {
    if (!generatedModule.compiled) {
      return null;
    }
    if (!consumerModule.compiled) {
      return null;
    }
    try {
      const require = createRequire(
        {
          messages: generatedModule.compiled,
          main: consumerModule.compiled,
        },
        {
          react: React,
        }
      );

      const { default: Result } = require('main');

      return Result();
    } catch (error) {
      return <RendererError error={error} />;
    }
  }, [generatedModule, consumerModule]);

  return {
    generatedModule,
    consumerModule,
    renderedResult,
  };
}

interface PlaygroundProps {
  className?: string;
}

export default function Playground({ className }: PlaygroundProps) {
  const classes = useStyles();

  const [generatedCodeOpen, setGeneratedCodeOpen] = React.useState(false);
  const [icuInput, setIcuInput] = React.useState<string>(SAMPLE.trim());
  const [consumerInput, setConsumerInput] = React.useState<string>(
    `import * as React from 'react';
import { ${COMPONENT_NAME} } from 'messages';

export default function () {
  return <${COMPONENT_NAME} gender="male" count={5} />
}`
  );

  const { generatedModule, consumerModule, renderedResult } = usePlayground({
    icuInput,
    consumerInput,
  });

  return (
    <div className={clsx(classes.root, className)}>
      <Paper className={clsx(classes.pane, classes.column, classes.paper)}>
        <Toolbar variant="dense">
          <Typography className={classes.paneTitle}>ICU message</Typography>
          <Tooltip title="Generated component">
            <IconButton onClick={() => setGeneratedCodeOpen(true)}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Editor
          className={classes.editor}
          value={icuInput}
          onChange={setIcuInput}
          errors={generatedModule.errors.map(toEditorError)}
        />
        <CodeDialog
          onClose={() => setGeneratedCodeOpen(false)}
          open={generatedCodeOpen}
          title="Generated code"
          code={generatedModule.code}
        />
      </Paper>
      <div className={classes.column}>
        <Paper
          className={clsx(classes.pane, classes.rightPanel, classes.paper)}
        >
          <Toolbar variant="dense">
            <Typography className={classes.paneTitle}>Consumer</Typography>
          </Toolbar>
          <Editor
            mode="jsx"
            className={classes.editor}
            value={consumerInput}
            onChange={setConsumerInput}
            errors={consumerModule.errors}
          />
        </Paper>
        <div className={clsx(classes.rightPanel, classes.pane)}>
          <Toolbar variant="dense">
            <Typography className={classes.paneTitle}>
              Rendered result
            </Typography>
          </Toolbar>
          <div className={classes.renderResultContainer}>
            <div className={classes.renderResult}>{renderedResult}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
