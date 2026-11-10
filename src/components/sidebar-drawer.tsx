import { FiLayout } from 'react-icons/fi';
import { clsx } from 'clsx';
import { MobileDrawer } from './mobile-drawer';
import { useDrawer } from '@/lib/use-drawer';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { useEffect, useRef } from 'react';

interface SidebarDrawerProps {
  locale: Locale;
}

/**
 * Island half of the source's `SidebarLayout`: the floating open-sidebar
 * button plus the mobile `MobileDrawer`. The sidebar itself is server-rendered
 * once in `sidebar-layout.astro`'s desktop aside (hidden below `lg`); while
 * the drawer is open that `[data-sidebar-content]` node is moved into the
 * drawer and put back on close, so its markup ships once and any island
 * inside it keeps its state.
 */
export function SidebarDrawer({ locale }: SidebarDrawerProps) {
  const { open, setOpen, mounted } = useDrawer();
  const dictionary = getDictionary(locale);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const content = document.querySelector<HTMLElement>('[data-sidebar-content]');
    if (!open || !host || !content) return;
    const placeholder = document.createComment('sidebar-content');
    content.before(placeholder);
    host.append(content);
    return () => placeholder.replaceWith(content);
  }, [open, mounted]);

  return (
    <>
      <MobileDrawer
        open={open}
        mounted={mounted}
        id="mobile-sidebar-drawer"
        onClose={() => setOpen(false)}
        title={dictionary.common.sidebar}
        icon={<FiLayout className="h-5 w-5" />}
        closeLabel={dictionary.common.closeSidebar}
      >
        <div ref={hostRef} />
      </MobileDrawer>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={dictionary.common.openSidebar}
        aria-expanded={open}
        aria-controls="mobile-sidebar-drawer"
        className={clsx(
          'fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-md backdrop-blur transition hover:bg-slate-100 hover:text-accent dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden'
        )}
      >
        <FiLayout className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}
