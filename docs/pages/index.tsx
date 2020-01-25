import React from 'react';
import {
  Grid,
  Container,
  Link,
  Typography,
  makeStyles,
  Box
} from '@material-ui/core';
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
      <Box mt={5}>
        <Grid container>
          <Grid item xs={12} md={6}>
            <Typography align="center" variant="h6">
              Put in ICU formatted messages
            </Typography>
            <Highlighter mode="jsx" value={exampleInput} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography align="center" variant="h6">
              Get out React components
            </Typography>
            <Highlighter mode="jsx" value={exampleOutput} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default Home;
