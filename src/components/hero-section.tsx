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
const INTRO_PLAYED_KEY = 'home-intro-played';
/**
 * `pending` is the server render and the hydration render (an empty terminal,
 * no rain), so hydration always matches; a post-mount effect then picks
 * `matrix` (first visit this session) or `final` (intro already played).
 */
type IntroPhase = 'pending' | 'matrix' | 'transition' | 'typing' | 'final';

// Module state survives ClientRouter soft navigations within the document,
// and covers browsers where sessionStorage is unavailable.
let introPlayedThisDocument = false;

function hasPlayedIntro(): boolean {
  if (introPlayedThisDocument) return true;
  try {
    return window.sessionStorage.getItem(INTRO_PLAYED_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroPlayed() {
  introPlayedThisDocument = true;
  try {
    window.sessionStorage.setItem(INTRO_PLAYED_KEY, '1');
  } catch {
    // Storage blocked: the module flag still covers this document.
  }
}

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
  const [introPhase, setIntroPhase] = useState<IntroPhase>('pending');

  // Play the Matrix + typing intro once per browser session; later visits
  // (full loads or ClientRouter navigations) show the finished terminal.
  useEffect(() => {
    if (introPhase !== 'pending') return;
    setIntroPhase(hasPlayedIntro() ? 'final' : 'matrix');
  }, [introPhase]);

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

  // Reduced motion and a replayed visit both render the final frame at once.
  const showFinal = reducedMotion || introPhase === 'final';
  const startTyping = !showFinal && introPhase === 'typing';
  const matrixVisible =
    !showFinal && (introPhase === 'matrix' || introPhase === 'transition');
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
          skipIntro={showFinal}
          onIntroComplete={markIntroPlayed}
          startTyping={startTyping}
          matrixVisible={matrixVisible}
          matrixOpacity={matrixOpacity}
        />
      </div>
    </div>
  );
}
