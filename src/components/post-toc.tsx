'use client';

import { useEffect, useRef, useState } from 'react';
import { FiList } from 'react-icons/fi';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export function PostToc({
  onLinkClick,
  contentKey,
  showTitle = true,
  className,
  title = 'Contents'
}: {
  onLinkClick?: () => void;
  contentKey?: string;
  showTitle?: boolean;
  className?: string;
  title?: string;
}) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicator, setIndicator] = useState({ top: 0, opacity: 0 });

  // Reset TOC state when the rendered content changes. Setting state during
  // render (the documented alternative to `setState` in an effect) keeps the
  // reset in lock-step with the render that introduces a new content key.
  const [prevContentKey, setPrevContentKey] = useState(contentKey);
  if (contentKey !== prevContentKey) {
    setPrevContentKey(contentKey);
    setItems([]);
    setActiveId(null);
  }

  useEffect(() => {
    // Reset heading→node refs before the (re)scan for the new content key.
    itemRefs.current = {};

    const containerSelector = contentKey
      ? `[data-toc-content="${contentKey}"]`
      : '[data-toc-content]';
    const container = document.querySelector<HTMLElement>(containerSelector);

    if (!container) {
      return undefined;
    }

    let observer: IntersectionObserver | null = null;
    let rafId1: number;
    let rafId2: number;

    // Use double requestAnimationFrame to ensure DOM has been painted
    // This is more reliable than setTimeout for DOM updates
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        const headings = Array.from(
          container.querySelectorAll<HTMLElement>('h2, h3')
        );
        const mapped = headings
          .filter((el) => el.id)
          .map((el) => ({
            id: el.id,
            text: el.innerText,
            depth: el.tagName === 'H3' ? 3 : 2
          }));
        setItems(mapped);

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const id = (entry.target as HTMLElement).id;
                if (id) {
                  setActiveId(id);
                }
              }
            });
          },
          {
            // Trigger when heading is in upper 40% of viewport
            rootMargin: '0px 0px -60% 0px',
            threshold: 0.1
          }
        );

        headings.forEach((el) => observer?.observe(el));
      });
    });

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [contentKey]);

  useEffect(() => {
    if (!activeId || !listRef.current) {
      setIndicator({ top: 0, opacity: 0 });
      return;
    }
    const activeEl = itemRefs.current[activeId];
    if (!activeEl) return;
    const listTop = listRef.current.getBoundingClientRect().top;
    const { top, height } = activeEl.getBoundingClientRect();
    setIndicator({ top: top - listTop + height / 2, opacity: 1 });
  }, [activeId, items.length]);

  const handleClick = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // Temporary highlight
    el.classList.add('toc-target-highlight');
    setTimeout(() => {
      el.classList.remove('toc-target-highlight');
    }, 700);

    // Update hash without instant jump
    if (history.replaceState) {
      const url = new URL(window.location.href);
      url.hash = id;
      history.replaceState(null, '', url.toString());
    }

    // Trigger callback if provided (e.g. to close mobile menu)
    if (onLinkClick) {
      onLinkClick();
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={`not-prose text-slate-500 dark:text-slate-400 ${className || 'sticky top-20'}`}>
      {showTitle && (
        <div className="mb-2 inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
          <FiList className="h-4 w-4 text-slate-400" />
          {title}
        </div>
      )}
      <div className="relative pl-4">
        <span className="absolute left-1 top-0 h-full w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <span
          className="absolute left-0 h-3 w-3 -translate-y-1/2 rounded-full bg-accent transition-all duration-200 ease-snappy"
          style={{ top: `${indicator.top}px`, opacity: indicator.opacity }}
          aria-hidden="true"
        />
        <div
          ref={listRef}
          className="space-y-1 text-[0.95rem]"
          role="list"
        >
          {items.map((item) => (
            <div
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              role="listitem"
              className={`relative ${item.depth === 3 ? 'pl-3' : 'pl-0'}`}
            >
              <a
                href={`#${item.id}`}
                onClick={handleClick(item.id)}
                className={`line-clamp-2 inline-flex items-center py-1 pl-2 hover:text-blue-600 dark:hover:text-blue-400 ${item.id === activeId
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : ''
                  }`}
              >
                {item.text}
              </a>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
