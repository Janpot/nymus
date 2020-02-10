import * as React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    padding: theme.spacing(1)
  },
  content: {
    height: '100%',
    flex: 1
  }
}));

type PaneProps = React.PropsWithChildren<{
  className: string;
  title: string;
}>;

export default function Pane({ className, children, title }: PaneProps) {
  const classes = useStyles();

  return (
    <div className={clsx(classes.root, className)}>
      <div className={classes.title}>{title}</div>
      <div className={classes.content}>{children}</div>
    </div>
  );
}
