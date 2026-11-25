import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'hr',
];

export function renderContent(markdown: string) {
  const html = marked.parse(markdown, { async: false }) as string;
  const clean = sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }),
    },
  });

  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  return { html: clean, text };
}
