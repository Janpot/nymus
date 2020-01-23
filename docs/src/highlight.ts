import { highlight, getLanguage } from 'highlight.js';

const escapeMap: any = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeForHTML(input: string): string {
  return input.replace(/([&<>'"])/g, char => escapeMap[char]);
}

export default function highlightCode(code: string, lang?: string): string {
  if (!lang) {
    console.log(code);
    return `<pre><code class="hljs">${escapeForHTML(code)}</code></pre>`;
  }
  if (!getLanguage(lang)) {
    throw new Error(`Unrecognized language "${lang}"`);
  }
  const { value } = highlight(lang, code);
  return `<pre><code class="hljs ${lang}">${value}</code></pre>`;
}
