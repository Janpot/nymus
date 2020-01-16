import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  title: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    overflow: 'auto'
  }
});

export default function Layout({ children }: React.PropsWithChildren<{}>) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <AppBar position="static" color="default">
        <Toolbar variant="dense">
          <Typography variant="h6" className={classes.title}>
            icur
          </Typography>
          <Button color="inherit">Docs</Button>
          <Button color="inherit">Playground</Button>
        </Toolbar>
      </AppBar>
      <div className={classes.content}>{children}</div>
    </div>
  );
}
