'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMounted } from '@/lib/use-mounted';

function supportsScrollDrivenAnimations(): boolean {
  if (typeof CSS === 'undefined') return false;
  return CSS.supports?.('animation-timeline', 'scroll()') ?? false;
}

export function ReadingProgress() {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useScrollDriven, setUseScrollDriven] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      setUseScrollDriven(
        supportsScrollDrivenAnimations() && !prefersReducedMotion
      );
    };
    updateMode();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', updateMode);
    return () => mq.removeEventListener('change', updateMode);
  }, []);

  const handleScroll = useCallback(() => {
    if (!mounted || useScrollDriven) return;
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const total = scrollHeight - clientHeight;
    if (total <= 0) {
      setProgress(0);
      return;
    }
    const value = Math.min(100, Math.max(0, (scrollTop / total) * 100));
    setProgress(value);
  }, [mounted, useScrollDriven]);

  useEffect(() => {
    if (!mounted || useScrollDriven) return;

    // Defer the initial measurement so state is not set synchronously inside
    // the effect body (lint-clean, same first-paint result).
    const raf = requestAnimationFrame(handleScroll);
    window.addEventListener('scroll', handleScroll, { passive: true, signal: AbortSignal.timeout(60000) });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted, useScrollDriven, handleScroll]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1200] h-1.5 bg-transparent">
      <div className="relative h-1.5 w-full overflow-visible">
        {useScrollDriven ? (
          <div aria-hidden="true" className="reading-progress-bar-scroll-driven absolute inset-y-0 left-0 w-full origin-left rounded-full bg-accent">
            <span
              className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/80 blur-[1px] dark:bg-slate-900/80"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div
            className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-accent will-change-transform transition-[transform,opacity] duration-300 ease-out"
            style={{
              transform: `scaleX(${progress / 100})`,
              opacity: progress > 0 ? 1 : 0
            }}
            aria-hidden="true"
          >
            <span
              className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/80 blur-[1px] dark:bg-slate-900/80"
              aria-hidden="true"
            />
          </div>
        )}
        <span
          className="absolute inset-x-0 top-2 h-px bg-gradient-to-r from-transparent via-accent-soft to-transparent blur-sm"
          aria-hidden="true"
        />
      </div>
    </div>,
    document.body
  );
}
