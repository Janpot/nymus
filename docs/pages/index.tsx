import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import Link from '@material-ui/core/Link';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import { Box } from '@material-ui/core';
import transform from '../src/transform';
import dynamic from 'next/dynamic';

const Highlighter = dynamic(() => import('../src/components/Highlighter'), {
  ssr: false
});

const useStyles = makeStyles(theme => ({
  logo: {
    fontSize: 100
  },
  title: {
    marginTop: theme.spacing(5)
  },
  subtitle: {
    fontSize: 20
  }
}));

interface HomePageProps {
  exampleInput: string;
  exampleOutput: string;
}

export async function unstable_getStaticProps(): Promise<{
  props: HomePageProps;
}> {
  const sample = {
    Message: 'Hello there, {name}, your score is {score, number, percent}.',
    CurrentTime: "It's {now, time, short}."
  };
  return {
    props: {
      exampleInput: JSON.stringify(sample, null, 2),
      exampleOutput: await transform(sample)
    }
  };
}

function Home({ exampleInput, exampleOutput }: HomePageProps) {
  const classes = useStyles();
  return (
    <Container className={classes.title}>
      <Typography variant="h1" align="center">
        nymus
      </Typography>
      <Typography align="center">
        Transform{' '}
        <Link href="http://userguide.icu-project.org/formatparse/messages">
          ICU message format
        </Link>{' '}
        into React components
      </Typography>
      <Box>
        Put in ICU formatted messages
        <Highlighter mode="jsx" value={exampleInput} />
      </Box>
      <Box>
        Get out React components
        <Highlighter mode="jsx" value={exampleOutput} />
      </Box>
    </Container>
  );
}

export default Home;
