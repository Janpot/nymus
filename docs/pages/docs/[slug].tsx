import * as path from 'path';
import * as fs from 'fs';
import Link from '../../src/components/Link';
import { promisify } from 'util';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, Box } from '@material-ui/core';
import Mdx from '@mdx-js/runtime';
import ReactDomServer from 'react-dom/server';
import CodeBlock from '../../src/components/CodeBlock';
import Layout from '../../src/components/Layout';

const fsReadFile = promisify(fs.readFile);

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
    )
  };
  return ReactDomServer.renderToStaticMarkup(
    <Mdx components={components}>{markdown}</Mdx>
  );
}
async function getManifest() {
  return import('../../markdown/manifest.json');
}

export async function unstable_getStaticPaths() {
  const { routes } = await getManifest();
  return {
    paths: routes.map(route => ({
      params: { slug: path.basename(route.path) }
    }))
  };
}

async function readMarkdownFile(slug: string): Promise<string> {
  const fileContent = await fsReadFile(
    path.resolve('./markdown', slug + '.md'),
    { encoding: 'utf-8' }
  );
  const markup = await renderMarkdown(fileContent);
  return markup;
}

interface DocumentationPageProps {
  routes?: { title: string; path: string }[];
  content?: string;
  slug: string;
}

export async function unstable_getStaticProps({
  params
}: {
  params: { slug: string };
}): Promise<{ props: DocumentationPageProps }> {
  const [manifest, content] = await Promise.all([
    getManifest(),
    readMarkdownFile(params.slug)
  ]);
  return { props: { routes: manifest.routes, content, slug: params.slug } };
}

const useStyles = makeStyles(theme => ({
  content: {}
}));

export default function DocumentationPage({
  routes = [],
  content = ''
}: DocumentationPageProps) {
  const classes = useStyles();
  return (
    <Layout>
      <Container maxWidth="lg">
        <Grid container spacing={5}>
          <Grid
            item
            xs={12}
            md={8}
            className={classes.content}
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <Grid item xs={12} md={4}>
            <Box mt={4} position={{ md: 'fixed' }}>
              <Typography variant="h6">Docs</Typography>
              {routes.map(route => (
                <Link
                  display="block"
                  key={route.path}
                  variant="body1"
                  href={`/docs/${route.path}`}
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
