'use client';

import { useState, useRef, useEffect, useId, useSyncExternalStore, type FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  FiHome,
  FiFileText,
  FiFile,
  FiUser,
  FiMail,
  FiMapPin,
  FiFeather,
  FiTag,
  FiServer,
  FiCpu,
  FiList,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { useModalDialog } from '@/lib/use-modal-dialog';

export type IconKey =
  | 'home'
  | 'blog'
  | 'file'
  | 'user'
  | 'contact'
  | 'location'
  | 'pen'
  | 'tags'
  | 'server'
  | 'device'
  | 'menu';

const ICON_MAP: Record<IconKey, any> = {
  home: FiHome,
  blog: FiFileText,
  file: FiFile,
  user: FiUser,
  contact: FiMail,
  location: FiMapPin,
  pen: FiFeather,
  tags: FiTag,
  server: FiServer,
  device: FiCpu,
  menu: FiList,
};

export interface NavLinkItem {
  key: string;
  /** Pre-localized by the `.astro` caller (localizedPath). */
  href?: string;
  label: string;
  iconKey: IconKey;
  children?: NavLinkItem[];
}

interface NavMenuProps {
  items: NavLinkItem[];
  labels: Pick<Dictionary['common'], 'openMenu' | 'closeMenu' | 'navigationMenu'>;
  /** `Astro.url.pathname`, passed by the `.astro` host (replaces `usePathname`). */
  currentPath: string;
}

function normalizeRoutePath(path: string): string {
  return (
    path
      .split(/[?#]/, 1)[0]
      .replace(/^\/(?:zh-TW|en)(?=\/|$)/, '')
      .replace(/\/$/, '') || '/'
  );
}

const subscribeToClientMount = () => () => {};

export function NavMenu({ items, labels, currentPath }: NavMenuProps) {
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [expandedMobileItems, setExpandedMobileItems] = useState<string[]>([]);
  const closeTimer = useRef<number | null>(null);
  const menuId = useId();
  const mobileDialogId = `${menuId}-mobile-navigation`;
  const routeKey = currentPath || '/';
  const open = openPathname === routeKey;
  const mounted = useSyncExternalStore(subscribeToClientMount, () => true, () => false);
  const normalizedCurrentPath = normalizeRoutePath(routeKey);
  const close = () => setOpenPathname(null);
  const { dialogRef, handleKeyDown } = useModalDialog(open, close);

  const isRouteActive = (href?: string) => {
    if (!href) return false;
    const targetPath = normalizeRoutePath(href);

    return targetPath === '/'
      ? normalizedCurrentPath === '/'
      : normalizedCurrentPath === targetPath || normalizedCurrentPath.startsWith(`${targetPath}/`);
  };

  const getAriaCurrent = (href?: string): 'page' | 'location' | undefined => {
    if (!href) return undefined;
    const targetPath = normalizeRoutePath(href);
    if (normalizedCurrentPath === targetPath) return 'page';
    return isRouteActive(href) ? 'location' : undefined;
  };

  const isGroupActive = (item: NavLinkItem) =>
    item.children?.some((child) => isRouteActive(child.href)) ?? false;

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggle = () => setOpenPathname((value) => (value === routeKey ? null : routeKey));

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setActiveDropdown(null);
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openDropdown = (key: string) => {
    clearCloseTimer();
    setActiveDropdown(key);
  };

  const scheduleCloseDropdown = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setActiveDropdown(null), 180);
  };

  const toggleMobileItem = (key: string) => {
    setExpandedMobileItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderDesktopChild = (item: NavLinkItem) => {
    const Icon = ICON_MAP[item.iconKey] ?? FiFile;
    const isActive = isRouteActive(item.href);
    return item.href ? (
      <a
        key={item.key}
        href={item.href}
        aria-current={getAriaCurrent(item.href)}
        className={`motion-link inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:hover:bg-slate-800 dark:hover:text-accent ${
          isActive
            ? 'bg-accent-soft text-accent-textLight dark:bg-slate-800 dark:text-accent-textDark'
            : 'text-slate-600 dark:text-slate-200'
        }`}
        onClick={close}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
        <span className="whitespace-nowrap">{item.label}</span>
      </a>
    ) : null;
  };

  const renderMobileItem = (item: NavLinkItem, depth = 0) => {
    const Icon = ICON_MAP[item.iconKey] ?? FiFile;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMobileItems.includes(item.key);
    const groupId = `${menuId}-mobile-group-${depth}-${encodeURIComponent(item.key).replaceAll('%', '')}`;
    const isActive = hasChildren ? isGroupActive(item) : isRouteActive(item.href);

    if (hasChildren) {
      return (
        <div key={item.key} className="flex flex-col">
          <button
            type="button"
            onClick={() => toggleMobileItem(item.key)}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors active:bg-slate-100 dark:active:bg-slate-800 dark:hover:text-accent ${
              isActive
                ? 'bg-accent-soft text-accent-textLight dark:bg-slate-800 dark:text-accent-textDark'
                : 'text-slate-700 dark:text-slate-200'
            }`}
            aria-expanded={isExpanded}
            aria-controls={groupId}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </div>
            <FiChevronRight
              className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
          <div
            id={groupId}
            aria-hidden={!isExpanded}
            inert={!isExpanded}
            className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 pl-4 pt-1">
                {item.children!.map((child) => renderMobileItem(child, depth + 1))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return item.href ? (
      <a
        key={item.key}
        href={item.href}
        aria-current={getAriaCurrent(item.href)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors active:bg-slate-100 dark:active:bg-slate-800 dark:hover:text-accent ${
          isActive
            ? 'bg-accent-soft text-accent-textLight dark:bg-slate-800 dark:text-accent-textDark'
            : 'text-slate-700 dark:text-slate-200'
        }`}
        onClick={close}
      >
        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
        <span className="whitespace-nowrap">{item.label}</span>
      </a>
    ) : null;
  };

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button
        type="button"
        className="relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-accent lg:hidden"
        aria-label={open ? labels.closeMenu : labels.openMenu}
        aria-expanded={open}
        aria-controls={mobileDialogId}
        onClick={toggle}
      >
        <div className="relative h-5 w-5">
          <span
            className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-current transition-all duration-300 ease-snappy ${open ? 'rotate-45' : '-translate-y-1.5'}`}
          />
          <span
            className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-current transition-all duration-300 ease-snappy ${open ? 'opacity-0' : 'opacity-100'}`}
          />
          <span
            className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-current transition-all duration-300 ease-snappy ${open ? '-rotate-45' : 'translate-y-1.5'}`}
          />
        </div>
      </button>

      {/* Mobile Menu Overlay - Portaled */}
      {mounted &&
        createPortal(
          <div
            ref={dialogRef}
            id={mobileDialogId}
            className={`fixed inset-0 z-[100] flex flex-col bg-white/95 backdrop-blur-xl transition-all duration-300 ease-snappy dark:bg-gray-950/95 lg:hidden ${open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}
            role="dialog"
            aria-modal={open ? 'true' : undefined}
            aria-label={labels.navigationMenu}
            aria-hidden={!open}
            inert={!open}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            {/* Close button area */}
            <div className="flex items-center justify-end px-4 py-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-accent"
                onClick={close}
                aria-label={labels.closeMenu}
                data-dialog-initial-focus
              >
                <div className="relative h-5 w-5">
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rotate-45 bg-current" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 -rotate-45 bg-current" />
                </div>
              </button>
            </div>

            <div className="container mx-auto flex flex-1 flex-col px-4 pb-8">
              <nav aria-label={labels.navigationMenu} className="scroll-panel flex flex-1 flex-col gap-2 pt-4">
                {items.map((item) => renderMobileItem(item))}
              </nav>

              <div className="mt-auto pt-8 text-center text-xs text-slate-400">
                <p>© {new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Desktop Menu */}
      <nav className="hidden lg:flex lg:items-center lg:gap-3">
        {items.map((item) => {
          if (item.children && item.children.length > 0) {
            const Icon = ICON_MAP[item.iconKey] ?? FiFile;
            const isOpen = activeDropdown === item.key;
            const dropdownId = `${menuId}-desktop-group-${encodeURIComponent(item.key).replaceAll('%', '')}`;
            const isActive = isGroupActive(item);
            return (
              <div
                key={item.key}
                className="group relative"
                onMouseEnter={() => openDropdown(item.key)}
                onMouseLeave={scheduleCloseDropdown}
                onFocus={() => openDropdown(item.key)}
                onBlur={handleBlur}
              >
                <button
                  type="button"
                  className={`motion-link type-nav inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:hover:text-accent ${
                    isActive
                      ? 'bg-accent-soft text-accent-textLight dark:bg-slate-800 dark:text-accent-textDark'
                      : 'text-slate-600 dark:text-slate-200'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={dropdownId}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-accent dark:group-hover:text-accent" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  <FiChevronDown className="h-3 w-3 shrink-0 text-slate-400 transition group-hover:text-accent dark:group-hover:text-accent" />
                </button>

                <div
                  id={dropdownId}
                  className={`absolute left-0 top-full z-50 hidden min-w-[12rem] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg transition duration-200 ease-snappy dark:border-slate-800 dark:bg-slate-900 lg:block ${isOpen ? 'pointer-events-auto translate-y-2 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'}`}
                  role="menu"
                  aria-label={item.label}
                  aria-hidden={!isOpen}
                  inert={!isOpen}
                >
                  <div className="flex flex-col gap-1">
                    {item.children.map((child) => renderDesktopChild(child))}
                  </div>
                </div>
              </div>
            );
          }

          const Icon = ICON_MAP[item.iconKey] ?? FiFile;
          const isActive = isRouteActive(item.href);

          return item.href ? (
            <a
              key={item.key}
              href={item.href}
              aria-current={getAriaCurrent(item.href)}
              className={`motion-link type-nav group relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:hover:text-accent ${
                isActive
                  ? 'bg-accent-soft text-accent-textLight dark:bg-slate-800 dark:text-accent-textDark'
                  : 'text-slate-600 dark:text-slate-200'
              }`}
              onClick={close}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 transition group-hover:text-accent ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
              <span className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-accent transition duration-180 ease-snappy group-hover:scale-x-100 ${isActive ? 'scale-x-100' : 'scale-x-0'}`} aria-hidden="true" />
            </a>
          ) : null;
        })}
      </nav>
    </>
  );
}
