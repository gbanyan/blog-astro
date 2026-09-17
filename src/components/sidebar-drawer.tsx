'use client';

import { FiLayout } from 'react-icons/fi';
import { clsx } from 'clsx';
import { MobileDrawer } from './mobile-drawer';
import { useDrawer } from '@/lib/use-drawer';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { RightSidebarContent } from './right-sidebar';

interface SidebarDrawerProps {
  tags: { tag: string; slug: string; count: number }[];
  aboutUrl: string;
  avatarSrc: string;
  locale: Locale;
  variant?: 'default' | 'reading';
}

/**
 * Island half of the source's `SidebarLayout`: the floating open-sidebar
 * button plus the mobile `MobileDrawer` (lines 43–75 of
 * components/sidebar-layout.tsx). The desktop grid shell is static markup in
 * `sidebar-layout.astro`.
 */
export function SidebarDrawer({
  tags,
  aboutUrl,
  avatarSrc,
  locale,
  variant = 'default'
}: SidebarDrawerProps) {
  const { open, setOpen, mounted } = useDrawer();
  const dictionary = getDictionary(locale);

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
        {open && (
          <RightSidebarContent
            tags={tags}
            aboutUrl={aboutUrl}
            avatarSrc={avatarSrc}
            locale={locale}
            forceLoadFeed
            variant={variant}
          />
        )}
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