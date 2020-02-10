import React from 'react';
import {
  Grid,
  Container,
  Link,
  Typography,
  makeStyles,
  Box
} from '@material-ui/core';
import highlight from '../src/highlight';
import Layout from '../src/components/Layout';

const useStyles = makeStyles(theme => ({
  title: {
    marginTop: theme.spacing(5)
  },
  subtitle: {
    fontSize: 20
  },
  code: {
    '& .hljs': {
      padding: theme.spacing(3)
    }
  }
}));

interface HomePageProps {
  exampleInput: string;
  exampleOutput: string;
}

export async function unstable_getStaticProps(): Promise<{
  props: HomePageProps;
}> {
  const input = {
    Message: 'Hi {name}, your score is {score, number, percent}.',
    CurrentDate: "It's {now, time, short}.",
    Basket: 'I have {eggs, plural, one {one egg} other {# eggs}}.',
    Progress: 'Your score went {direction, select, up {up} other {down}}.',
    Navigate: 'Go to our <Link>about page</Link>.'
  };
  const output = [
    '<Message name="johnny" score={0.75} />',
    '<CurrentDate now={new Date()} />',
    '<Basket eggs={12} />',
    "<Progress direction='up' />",
    "<Navigate Link={props => <a href='/about'>{props.children}</a>} />"
  ].join('\n');
  return {
    props: {
      exampleInput: highlight(JSON.stringify(input, null, 2), 'json'),
      exampleOutput: highlight(output, 'jsx')
    }
  };
}

function Home({ exampleInput, exampleOutput }: HomePageProps) {
  const classes = useStyles();
  return (
    <Layout>
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
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography align="center" variant="h6">
                Put in ICU formatted messages
              </Typography>
              <div
                className={classes.code}
                dangerouslySetInnerHTML={{ __html: exampleInput }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography align="center" variant="h6">
                Get out React components
              </Typography>
              <div
                className={classes.code}
                dangerouslySetInnerHTML={{ __html: exampleOutput }}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Layout>
  );
}

export default Home;
