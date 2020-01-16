import Header from './Header';
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
      <Header />
      <div className={classes.content}>{children}</div>
    </div>
  );
}
