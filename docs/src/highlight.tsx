import ReactDomServer from 'react-dom/server';
import CodeBlock from './components/CodeBlock';

export default function highlightCode(code: string, language: string): string {
  return ReactDomServer.renderToStaticMarkup(
    <CodeBlock language={language}>{code}</CodeBlock>
  );
}
