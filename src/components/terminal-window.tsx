import { MatrixRain } from './matrix-rain';
import { useState, useEffect, useCallback } from 'react';

// 眼睛 (霍德爾之目) - 雙鷹勾眼
const ASCII_ART = [
  '      /\\     /\\',
  '     /  \\   /  \\',
  '    |  > | |  > |',
  '     \\  /   \\  /',
  '      \\/     \\/',
];

interface TerminalWindowProps {
  title: string;
  tagline: string;
  ariaLabel: string;
  /** Skip typing animation, show all at once */
  reducedMotion?: boolean;
  /** Render the finished terminal immediately (intro already played, or
   *  reduced motion) — no typing, no cursor blink. */
  skipIntro?: boolean;
  /** Called once when the typing intro has fully played. */
  onIntroComplete?: () => void;
  /** Start the terminal text only after the Matrix intro has finished. */
  startTyping?: boolean;
  /** Keep the Matrix layer mounted during its fade-out transition. */
  matrixVisible?: boolean;
  matrixOpacity?: number;
  className?: string;
}

type Phase =
  | 'prompt'
  | 'typing-line1'
  | 'typing-line2'
  | 'prompt2'
  | 'typing-ascii'
  | 'done';

export function TerminalWindow({
  title,
  tagline,
  ariaLabel,
  reducedMotion = false,
  skipIntro = false,
  onIntroComplete,
  startTyping = true,
  matrixVisible = true,
  matrixOpacity = 1,
  className = '',
}: TerminalWindowProps) {
  const [typedPhase, setPhase] = useState<Phase>('prompt');
  const [typedPrompt, setDisplayedPrompt] = useState('');
  const [typedLine1, setDisplayedLine1] = useState('');
  const [typedLine2, setDisplayedLine2] = useState('');
  const [typedPrompt2, setDisplayedPrompt2] = useState('');
  const [displayedAscii, setDisplayedAscii] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  const prompt = 'cat ~/welcome.txt';
  const prompt2 = 'fastfetch';
  const line1 = `${title}`;
  const line2 = tagline;

  // skipIntro derives the finished frame directly (no state churn), so it
  // can switch on after mount without stepping through the phases.
  const phase: Phase = skipIntro ? 'done' : typedPhase;
  const displayedPrompt = skipIntro ? prompt : typedPrompt;
  const displayedLine1 = skipIntro ? line1 : typedLine1;
  const displayedLine2 = skipIntro ? line2 : typedLine2;
  const displayedPrompt2 = skipIntro ? prompt2 : typedPrompt2;
  const typingActive = startTyping && !skipIntro;

  const charDelay = reducedMotion ? 0 : 50;
  const lineDelay = reducedMotion ? 0 : 400;
  const asciiLineDelay = reducedMotion ? 0 : 80;
  const asciiLines =
    skipIntro || (reducedMotion && (phase === 'typing-ascii' || phase === 'done'))
      ? ASCII_ART
      : displayedAscii;
  const cursorVisible = reducedMotion || phase === 'done' ? true : showCursor;

  const typeString = useCallback(
    (
      str: string,
      setter: (s: string) => void,
      onComplete?: () => void
    ) => {
      if (reducedMotion) {
        setter(str);
        onComplete?.();
        return;
      }
      let i = 0;
      const id = setInterval(() => {
        if (i <= str.length) {
          setter(str.slice(0, i));
          i++;
        } else {
          clearInterval(id);
          onComplete?.();
        }
      }, charDelay);
      return () => clearInterval(id);
    },
    [charDelay, reducedMotion]
  );

  useEffect(() => {
    if (!typingActive || typedPhase !== 'prompt') return;

    let timeoutId: number | undefined;
    const cleanup = typeString(prompt, setDisplayedPrompt, () => {
      timeoutId = window.setTimeout(() => setPhase('typing-line1'), lineDelay);
    });
    return () => {
      cleanup?.();
      window.clearTimeout(timeoutId);
    };
  }, [typedPhase, prompt, typeString, lineDelay, typingActive]);

  useEffect(() => {
    if (!typingActive || typedPhase !== 'typing-line1') return;

    let timeoutId: number | undefined;
    const cleanup = typeString(line1, setDisplayedLine1, () => {
      timeoutId = window.setTimeout(() => setPhase('typing-line2'), lineDelay);
    });
    return () => {
      cleanup?.();
      window.clearTimeout(timeoutId);
    };
  }, [typedPhase, line1, typeString, lineDelay, typingActive]);

  useEffect(() => {
    if (!typingActive || typedPhase !== 'typing-line2') return;

    let timeoutId: number | undefined;
    const cleanup = typeString(line2, setDisplayedLine2, () => {
      timeoutId = window.setTimeout(() => setPhase('prompt2'), lineDelay);
    });
    return () => {
      cleanup?.();
      window.clearTimeout(timeoutId);
    };
  }, [typedPhase, line2, typeString, lineDelay, typingActive]);

  useEffect(() => {
    if (!typingActive || typedPhase !== 'prompt2') return;

    let timeoutId: number | undefined;
    const cleanup = typeString(prompt2, setDisplayedPrompt2, () => {
      timeoutId = window.setTimeout(() => setPhase('typing-ascii'), lineDelay);
    });
    return () => {
      cleanup?.();
      window.clearTimeout(timeoutId);
    };
  }, [typedPhase, prompt2, typeString, lineDelay, typingActive]);

  useEffect(() => {
    if (!typingActive || typedPhase !== 'typing-ascii') return;

    let timeoutId: number | undefined;
    if (reducedMotion) {
      timeoutId = window.setTimeout(() => setPhase('done'), lineDelay);
      return () => window.clearTimeout(timeoutId);
    }
    let lineIndex = 0;
    const id = setInterval(() => {
      if (lineIndex < ASCII_ART.length) {
        setDisplayedAscii((prev) => [...prev, ASCII_ART[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(id);
        timeoutId = window.setTimeout(() => setPhase('done'), lineDelay);
      }
    }, asciiLineDelay);
    return () => {
      clearInterval(id);
      window.clearTimeout(timeoutId);
    };
  }, [typedPhase, asciiLineDelay, lineDelay, reducedMotion, typingActive]);

  // Report a fully played intro (not a skipped one) exactly once.
  useEffect(() => {
    if (typingActive && typedPhase === 'done') onIntroComplete?.();
  }, [typedPhase, typingActive, onIntroComplete]);

  // Blinking cursor
  useEffect(() => {
    if (typingActive && !reducedMotion && phase !== 'done') {
      const id = setInterval(() => setShowCursor((c) => !c), 530);
      return () => clearInterval(id);
    }
  }, [phase, reducedMotion, typingActive]);

  return (
    <div
      className={`relative flex h-[330px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-xl dark:border-slate-700/50 dark:bg-slate-900 sm:h-[365px] lg:h-[420px] ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 ease-out dark:opacity-30"
        aria-hidden="true"
      >
        {matrixVisible && !reducedMotion && !skipIntro && (
          <MatrixRain
            className="h-full w-full"
            opacity={matrixOpacity}
          />
        )}
      </div>
      {/* macOS-style title bar */}
      <div className="relative z-10 flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700/50 sm:px-5 sm:py-3 lg:px-6 lg:py-3.5">
        <div className="flex gap-1.5 sm:gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/90 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
          <span className="h-3 w-3 rounded-full bg-amber-500/90 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/90 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
        </div>
        <span className="ml-4 font-mono text-xs text-slate-500 sm:text-sm dark:text-slate-400 lg:text-base">
          gbanyan@blog — zsh
        </span>
      </div>

      {/* Terminal content */}
      <div data-terminal-content className="relative z-10 min-h-0 flex-1 overflow-hidden px-4 py-4 font-mono text-sm sm:px-5 sm:py-5 sm:text-base lg:px-6 lg:py-6 lg:text-lg">
        {(startTyping || skipIntro) && <>
        <div className="text-slate-600 dark:text-slate-300">
          <span className="text-emerald-600 dark:text-emerald-400">~</span>
          <span className="text-slate-500"> $ </span>
          <span>{displayedPrompt}</span>
          {phase === 'prompt' && cursorVisible && (
            <span className="ml-0.5 inline-block h-4 w-0.5 motion-safe:animate-pulse bg-emerald-600 dark:bg-emerald-400" />
          )}
        </div>

        {displayedLine1 && (
          <div className="mt-2 text-slate-900 dark:text-slate-100">
            {displayedLine1}
            {phase === 'typing-line1' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 motion-safe:animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {displayedLine2 && (
          <div className="mt-1 text-slate-600 dark:text-slate-300">
            {displayedLine2}
            {phase === 'typing-line2' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 motion-safe:animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {(phase === 'prompt2' || phase === 'typing-ascii' || displayedPrompt2 || asciiLines.length > 0) && (
          <div className="mt-2 text-slate-600 dark:text-slate-300">
            <span className="text-emerald-600 dark:text-emerald-400">~</span>
            <span className="text-slate-500"> $ </span>
            <span>{displayedPrompt2}</span>
            {phase === 'prompt2' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 motion-safe:animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {asciiLines.length > 0 && (
          <div className="mt-2 whitespace-pre text-emerald-600/90 dark:text-emerald-400/90">
            {asciiLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {phase === 'typing-ascii' && cursorVisible && (
              <span className="inline-block h-4 w-0.5 motion-safe:animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-2 text-slate-600 dark:text-slate-300">
            <span className="text-emerald-600 dark:text-emerald-400">~</span>
            <span className="text-slate-500"> $ </span>
            <span className="inline-block h-4 w-4 motion-safe:animate-pulse border-l-2 border-emerald-600 dark:border-emerald-400" />
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
