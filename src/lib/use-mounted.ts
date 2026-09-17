'use client';

import { useEffect, useState } from 'react';

/**
 * Client-only mount flag for portal/decoration rendering.
 *
 * The flip is deferred past the synchronous effect body (via
 * requestAnimationFrame), so state is never applied synchronously inside an
 * effect — the same behaviour as the classic `useState(false)` +
 * `useEffect(() => setMounted(true))` pair, but lint-clean and still
 * hydration-safe (server and first client render both observe `false`).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
}
