import AppBar, { AppBarProps } from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Link, { NakedLink } from './Link';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import GitHubIcon from '@material-ui/icons/GitHub';
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
    <AppBar elevation={1} position="static" color="default" {...props}>
      <Toolbar>
        <Link href="/" variant="h6" color="inherit" className={classes.title}>
          nymus
        </Link>
        <Button
          component={NakedLink}
          href="/docs/[slug]"
          as="/docs/getting-started"
          color="inherit"
        >
          Docs
        </Button>
        <Button component={NakedLink} href="/playground" color="inherit">
          Playground
        </Button>
        <IconButton component="a" href="https://github.com/Janpot/nymus">
          <GitHubIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
