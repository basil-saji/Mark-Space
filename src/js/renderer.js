import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // Default base, theme logic handles specific colors

// Custom renderer for marked
const renderer = new marked.Renderer();

export function renderMarkdown(markdown) {
  return marked.parse(markdown);
}

export function generateTOC(markdown) {
  const tokens = marked.lexer(markdown);
  const headings = tokens
    .filter(token => token.type === 'heading')
    .map(token => {
      const text = typeof token.text === 'string' ? token.text : '';
      return {
        text: text,
        depth: token.depth,
        id: text.toLowerCase().replace(/[^\w]+/g, '-')
      };
    });
  return headings;
}

// Support for syntax highlighting (marked v15 style)
renderer.code = function({ text, lang }) {
  const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre data-lang="${language}"><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

// Custom renderer to add IDs to headings for jumping
renderer.heading = function({ text, depth }) {
  const plainText = typeof text === 'string' ? text : '';
  const id = plainText.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.use({ renderer, breaks: true, gfm: true });
