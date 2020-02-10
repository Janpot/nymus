import React from 'react';
import dynamic from 'next/dynamic';
import { makeStyles } from '@material-ui/core/styles';
import { CircularProgress } from '@material-ui/core';
import Layout from '../src/components/Layout';

const useStyles = makeStyles(theme => ({
  playground: {
    flex: 1
  },
  loading: {
    flex: 1,
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  }
}));

const Playground = dynamic(() => import('../src/components/Playground'), {
  ssr: false,
  loading: Loading
});

function Loading() {
  const classes = useStyles();
  return (
    <div className={classes.loading}>
      <CircularProgress />
    </div>
  );
}

export default function PlaygroundPage() {
  const classes = useStyles();
  return (
    <Layout>
      <Playground className={classes.playground} />
    </Layout>
  );
}
