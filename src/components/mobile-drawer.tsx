'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { FiX } from 'react-icons/fi';
import { useModalDialog } from '@/lib/use-modal-dialog';

interface MobileDrawerProps {
  open: boolean;
  mounted: boolean;
  id: string;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  closeLabel: string;
  /** 'right' renders a slide-over from the right; 'bottom' renders a bottom sheet. */
  side?: 'right' | 'bottom';
  /** z-index for the backdrop; the panel sits above it. Applied inline so the
   *  Tailwind JIT doesn't need to see dynamic class names. */
  backdropZ?: number;
  panelZ?: number;
  children: React.ReactNode;
}

/**
 * Shared mobile drawer: backdrop + panel + close button rendered in a portal.
 * The `open`/`mounted`/`onClose` trio comes from `useDrawer` (TARGET #3), so
 * callers only supply the content and styling knobs.
 */
export function MobileDrawer({
  open,
  mounted,
  id,
  onClose,
  title,
  icon,
  closeLabel,
  side = 'right',
  backdropZ = 1100,
  panelZ = 1110,
  children,
}: MobileDrawerProps) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useModalDialog(open, onClose);

  if (!mounted) return null;
  const fromRight = side === 'right';

  return createPortal(
    <>
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ zIndex: backdropZ }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        id={id}
        className={clsx(
          'fixed flex flex-col bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 lg:hidden',
          fromRight
            ? 'top-0 right-0 bottom-0 w-full max-w-sm rounded-l-2xl border-l border-white/20 dark:border-white/10'
            : 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t border-white/20 dark:border-white/10',
          'transition-transform duration-300 ease-snappy',
          fromRight
            ? open
              ? 'translate-x-0'
              : 'translate-x-full'
            : open
              ? 'translate-y-0'
              : 'translate-y-full'
        )}
        style={{ zIndex: panelZ }}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-4 dark:border-slate-700/50">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden="true">{icon}</span>
            <span id={titleId}>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-dialog-initial-focus
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-accent dark:hover:bg-slate-800 dark:hover:text-accent"
            aria-label={closeLabel}
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="scroll-panel flex-1 px-6 py-6">{children}</div>
      </div>
    </>,
    document.body
  );
}