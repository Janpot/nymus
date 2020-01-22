import React from 'react';
import dynamic from 'next/dynamic';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  playground: {
    flex: 1
  }
}));

const Playground = dynamic(() => import('../src/components/Playground'), {
  ssr: false
});

export default function PlaygroundPage() {
  const classes = useStyles();
  return <Playground className={classes.playground} />;
}
