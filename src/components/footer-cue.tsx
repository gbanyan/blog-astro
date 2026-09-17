'use client';

import { useEffect, useRef, useState } from 'react';

export function FooterCue({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      const id = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4 text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
      <span className="text-xs">{label}</span>
      <span
        className={`h-10 w-px overflow-hidden rounded-full bg-gradient-to-b from-transparent via-accent to-transparent transition-[height,opacity] duration-500 ease-snappy ${
          active ? 'opacity-80' : 'h-4 opacity-30'
        }`}
      />
    </div>
  );
}
