import AppBar, { AppBarProps } from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Link from './Link';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  title: {
    flexGrow: 1
  }
});

interface HeaderProps {}

export default function Header(props: HeaderProps & AppBarProps) {
  const classes = useStyles();
  return (
    <AppBar position="static" color="default" {...props}>
      <Toolbar variant="dense">
        <Typography variant="h6" className={classes.title}>
          icur
        </Typography>
        <Button component={Link} href="/" color="inherit">
          Docs
        </Button>
        <Button component={Link} href="/playground" color="inherit">
          Playground
        </Button>
      </Toolbar>
    </AppBar>
  );
}
