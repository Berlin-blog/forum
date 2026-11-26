import { useEffect, useState } from 'react';
import { fixContentHtml } from '../api';

type Props = {
  html: string;
  className?: string;
};

export function ContentHtml({ html, className = 'post-content' }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightbox(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return (
    <>
      <div
        className={className}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.tagName === 'IMG') setLightbox((target as HTMLImageElement).src);
        }}
        dangerouslySetInnerHTML={{ __html: fixContentHtml(html) }}
      />
      {lightbox && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="查看图片"
          onClick={() => setLightbox(null)}
        >
          <button className="lightbox-close" aria-label="关闭图片" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="放大的帖子图片" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}
