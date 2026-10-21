'use client';

import { useEffect, useState } from 'react';

export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }}
      aria-label={label}
      className="fixed bottom-6 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-2 ring-accent/30 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 dark:bg-accent dark:ring-accent/30 dark:hover:bg-accent/90"
    >
      <span className="text-lg leading-none">↑</span>
    </button>
  );
}
