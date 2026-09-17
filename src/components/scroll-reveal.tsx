'use client';

import { useEffect } from 'react';

/**
 * Page-level scroll-reveal observer. The source's `ScrollReveal` wrapped
 * children in a per-block island; Astro islands cannot wrap static content,
 * so page markup emits plain `<div class="scroll-reveal">` blocks and a
 * single island per page observes every one of them, adding `is-visible` on
 * first intersection. Threshold, root margin, once-semantics, and the 300ms
 * fallback timeout match the source exactly.
 */
export function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('.scroll-reveal')
    );
    if (els.length === 0) return;

    let fallbackId: number | undefined;
    let observer: IntersectionObserver | null = null;
    let done = false;

    const revealAll = () => {
      if (done) return;
      done = true;
      els.forEach((el) => el.classList.add('is-visible'));
      if (observer) observer.disconnect();
      if (fallbackId) window.clearTimeout(fallbackId);
    };

    if (!('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('is-visible');
          observer!.unobserve(el);
        }
        const remaining = els.filter((el) => !el.classList.contains('is-visible'));
        if (remaining.length === 0) {
          revealAll();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -20% 0px' }
    );

    els.forEach((el) => observer!.observe(el));
    // Safety net: reveal everything shortly after load, same as source.
    fallbackId = window.setTimeout(revealAll, 300);

    return () => {
      if (observer) observer.disconnect();
      if (fallbackId) window.clearTimeout(fallbackId);
    };
  }, []);

  return null;
}
