'use client';

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
  startTyping = true,
  matrixVisible = true,
  matrixOpacity = 1,
  className = '',
}: TerminalWindowProps) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [displayedPrompt, setDisplayedPrompt] = useState('');
  const [displayedLine1, setDisplayedLine1] = useState('');
  const [displayedLine2, setDisplayedLine2] = useState('');
  const [displayedPrompt2, setDisplayedPrompt2] = useState('');
  const [displayedAscii, setDisplayedAscii] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  const prompt = 'cat ~/welcome.txt';
  const prompt2 = 'fastfetch';
  const line1 = `${title}`;
  const line2 = tagline;

  const charDelay = reducedMotion ? 0 : 50;
  const lineDelay = reducedMotion ? 0 : 400;
  const asciiLineDelay = reducedMotion ? 0 : 80;
  const asciiLines =
    reducedMotion && (phase === 'typing-ascii' || phase === 'done')
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
    if (!startTyping || phase !== 'prompt') return;

      const cleanup = typeString(prompt, setDisplayedPrompt, () => {
        setTimeout(() => setPhase('typing-line1'), lineDelay);
      });
      return cleanup;
  }, [phase, prompt, typeString, lineDelay, startTyping]);

  useEffect(() => {
    if (!startTyping || phase !== 'typing-line1') return;

      const cleanup = typeString(line1, setDisplayedLine1, () => {
        setTimeout(() => setPhase('typing-line2'), lineDelay);
      });
      return cleanup;
  }, [phase, line1, typeString, lineDelay, startTyping]);

  useEffect(() => {
    if (!startTyping || phase !== 'typing-line2') return;

      const cleanup = typeString(line2, setDisplayedLine2, () => {
        setTimeout(() => setPhase('prompt2'), lineDelay);
      });
      return cleanup;
  }, [phase, line2, typeString, lineDelay, startTyping]);

  useEffect(() => {
    if (!startTyping || phase !== 'prompt2') return;

      const cleanup = typeString(prompt2, setDisplayedPrompt2, () => {
        setTimeout(() => setPhase('typing-ascii'), lineDelay);
      });
      return cleanup;
  }, [phase, prompt2, typeString, lineDelay, startTyping]);

  useEffect(() => {
    if (!startTyping || phase !== 'typing-ascii') return;

      if (reducedMotion) {
        setTimeout(() => setPhase('done'), lineDelay);
        return;
      }
      let lineIndex = 0;
      const id = setInterval(() => {
        if (lineIndex < ASCII_ART.length) {
          setDisplayedAscii((prev) => [...prev, ASCII_ART[lineIndex]]);
          lineIndex++;
        } else {
          clearInterval(id);
          setTimeout(() => setPhase('done'), lineDelay);
        }
      }, asciiLineDelay);
      return () => clearInterval(id);
  }, [phase, asciiLineDelay, lineDelay, reducedMotion, startTyping]);

  // Blinking cursor
  useEffect(() => {
    if (startTyping && !reducedMotion && phase !== 'done') {
      const id = setInterval(() => setShowCursor((c) => !c), 530);
      return () => clearInterval(id);
    }
  }, [phase, reducedMotion, startTyping]);

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
        {matrixVisible && !reducedMotion && (
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
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-4 py-4 font-mono text-sm sm:px-5 sm:py-5 sm:text-base lg:px-6 lg:py-6 lg:text-lg">
        {startTyping && <>
        <div className="text-slate-600 dark:text-slate-300">
          <span className="text-emerald-600 dark:text-emerald-400">~</span>
          <span className="text-slate-500"> $ </span>
          <span>{displayedPrompt}</span>
          {phase === 'prompt' && cursorVisible && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-600 dark:bg-emerald-400" />
          )}
        </div>

        {displayedLine1 && (
          <div className="mt-2 text-slate-900 dark:text-slate-100">
            {displayedLine1}
            {phase === 'typing-line1' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {displayedLine2 && (
          <div className="mt-1 text-slate-600 dark:text-slate-300">
            {displayedLine2}
            {phase === 'typing-line2' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {(phase === 'prompt2' || phase === 'typing-ascii' || displayedPrompt2 || asciiLines.length > 0) && (
          <div className="mt-2 text-slate-600 dark:text-slate-300">
            <span className="text-emerald-600 dark:text-emerald-400">~</span>
            <span className="text-slate-500"> $ </span>
            <span>{displayedPrompt2}</span>
            {phase === 'prompt2' && cursorVisible && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {asciiLines.length > 0 && (
          <div className="mt-2 whitespace-pre text-emerald-600/90 dark:text-emerald-400/90">
            {asciiLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {phase === 'typing-ascii' && cursorVisible && (
              <span className="inline-block h-4 w-0.5 animate-pulse bg-emerald-600 dark:bg-emerald-400" />
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-2 text-slate-600 dark:text-slate-300">
            <span className="text-emerald-600 dark:text-emerald-400">~</span>
            <span className="text-slate-500"> $ </span>
            <span className="inline-block h-4 w-4 animate-pulse border-l-2 border-emerald-600 dark:border-emerald-400" />
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
