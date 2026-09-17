'use client';

import { useSyncExternalStore } from 'react';
import { useEffect, useState } from 'react';
import { TerminalWindow } from './terminal-window';

interface HeroSectionProps {
  title: string;
  tagline: string;
  ariaLabel: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MATRIX_DURATION = 1800;
const MATRIX_FADE_DURATION = 500;
type IntroPhase = 'matrix' | 'transition' | 'typing';

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function HeroSection({ title, tagline, ariaLabel }: HeroSectionProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    () => false
  );
  const [introPhase, setIntroPhase] = useState<IntroPhase>('matrix');

  useEffect(() => {
    if (reducedMotion || introPhase !== 'matrix') return;

    const id = window.setTimeout(() => {
      setIntroPhase('transition');
    }, MATRIX_DURATION);

    return () => window.clearTimeout(id);
  }, [introPhase, reducedMotion]);

  useEffect(() => {
    if (introPhase !== 'transition') return;

    const id = window.setTimeout(() => {
      setIntroPhase('typing');
    }, MATRIX_FADE_DURATION);

    return () => window.clearTimeout(id);
  }, [introPhase]);

  const startTyping = reducedMotion || introPhase === 'typing';
  const matrixVisible = !reducedMotion && introPhase !== 'typing';
  const matrixOpacity = introPhase === 'matrix' ? 1 : 0;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* The terminal owns the clipped Matrix layer so the rain cannot spill
          into the hero or outside the window. */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6 sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <TerminalWindow
          className="terminal-hero-window"
          title={title}
          tagline={tagline}
          ariaLabel={ariaLabel}
          reducedMotion={reducedMotion}
          startTyping={startTyping}
          matrixVisible={matrixVisible}
          matrixOpacity={matrixOpacity}
        />
      </div>
    </div>
  );
}
