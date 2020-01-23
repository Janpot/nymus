import React from 'react';
import Container from '@material-ui/core/Container';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {}
}));

export default function PlaygroundPage() {
  const classes = useStyles();
  return <Container className={classes.root}>To Do</Container>;
}
