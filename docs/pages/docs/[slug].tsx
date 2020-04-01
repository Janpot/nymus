import * as path from 'path';
import { promises as fs } from 'fs';
import Link from '../../src/components/Link';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, Box, CircularProgress } from '@material-ui/core';
import Mdx from '@mdx-js/runtime';
import ReactDomServer from 'react-dom/server';
import CodeBlock from '../../src/components/CodeBlock';
import Layout from '../../src/components/Layout';
import manifest from '../../markdown/manifest.json';

interface CodeProps {
  className: string;
  children: string;
}

async function renderMarkdown(markdown: string) {
  const components = {
    code: ({ className, children }: CodeProps) => (
      <CodeBlock language={className.replace(/language-/, '')}>
        {children}
      </CodeBlock>
    ),
  };
  return ReactDomServer.renderToStaticMarkup(
    <Mdx components={components}>{markdown}</Mdx>
  );
}

export async function getStaticPaths() {
  const { routes } = manifest;
  return {
    paths: routes.map((route) => ({
      params: { slug: path.basename(route.path) },
    })),
    fallback: false,
  };
}

async function readMarkdownFile(slug: string): Promise<string> {
  const fileContent = await fs.readFile(
    path.resolve('./markdown', slug + '.md'),
    { encoding: 'utf-8' }
  );
  const markup = await renderMarkdown(fileContent);
  return markup;
}

interface DocumentationPageProps {
  content?: string;
}

export async function getStaticProps({
  params,
}: {
  params: { slug: string };
}): Promise<{ props: DocumentationPageProps }> {
  const content = await readMarkdownFile(params.slug);
  return { props: { content } };
}

const useStyles = makeStyles((theme) => ({
  loader: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(5),
  },
}));

export default function DocumentationPage({ content }: DocumentationPageProps) {
  const { routes } = manifest;
  const classes = useStyles();
  return (
    <Layout>
      <Container maxWidth="lg">
        <Grid container spacing={5}>
          <Grid item xs={12} md={8}>
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <div className={classes.loader}>
                <CircularProgress />
              </div>
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <Box mt={4} position={{ md: 'fixed' }}>
              <Typography variant="h6">Docs</Typography>
              {routes.map((route) => (
                <Link
                  display="block"
                  key={route.path}
                  variant="body1"
                  href="/docs/[slug]"
                  as={`/docs/${route.path}`}
                >
                  {route.title}
                </Link>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
