import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'hr', 'img',
];

export function renderContent(markdown: string) {
  const html = marked.parse(markdown, { async: false }) as string;
  const clean = sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }),
      img: (tagName, attribs) => {
        const src = attribs.src ?? '';
        const safe = /^https?:\/\//i.test(src)
          || src.startsWith('/uploads/')
          || /^data:image\/(webp|png|jpeg|gif);base64,/i.test(src);
        if (!safe) return { tagName, attribs: { alt: attribs.alt ?? '' } };
        return {
          tagName,
          attribs: {
            ...attribs,
            alt: attribs.alt ?? '',
            loading: 'lazy',
          },
        };
      },
    },
  });

  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  return { html: clean, text };
}
