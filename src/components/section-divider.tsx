'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface SectionDividerProps {
  children: ReactNode;
  className?: string;
}

export function SectionDivider({ children, className }: SectionDividerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -20% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx('space-y-4', className)}
    >
      <span
        className={clsx(
          'block h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-slate-200 via-accent-soft to-slate-200 transition-transform duration-500 ease-snappy dark:from-slate-800 dark:to-slate-800',
          visible ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-30'
        )}
      />
      {children}
    </div>
  );
}
