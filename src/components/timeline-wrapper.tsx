'use client';

import { Children } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useMounted } from '@/lib/use-mounted';

interface TimelineWrapperProps {
  children: ReactNode;
  className?: string;
}

export function TimelineWrapper({ children, className }: TimelineWrapperProps) {
  const mounted = useMounted();

  const items = Children.toArray(children);
  
  // Only render decorative elements after mount to prevent layout shift
  if (!mounted) {
    return (
      <div className={clsx('relative pl-6 md:pl-8', className)}>
        <div className="space-y-4">{items.map((child, index) => <div key={index} className="relative pl-5 sm:pl-8">{child}</div>)}</div>
      </div>
    );
  }

  return (
    <div className={clsx('relative pl-6 md:pl-8', className)}>
      <span
        className="pointer-events-none absolute left-2 top-0 h-full w-[2px] rounded-full bg-accent/40 md:left-3"
        aria-hidden="true"
      />

      <div className="space-y-4">
        {items.map((child, index) => (
          <div key={index} className="relative pl-5 sm:pl-8">
            <span className="pointer-events-none absolute left-0 top-1/2 h-px w-5 -translate-x-full -translate-y-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent sm:w-8" aria-hidden="true" />
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
