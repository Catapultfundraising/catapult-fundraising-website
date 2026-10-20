"use client";

import { useCallback, useEffect, useState } from "react";

// Keeps a piece of UI state (tab, open record, sub-view) in the URL query string so a browser refresh
// or a shared link lands on the same screen. Uses history.replaceState: no navigation, no re-render of the page.
function readParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}
export function writeParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  if (value === null || value === "") u.searchParams.delete(key); else u.searchParams.set(key, value);
  window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
}

/** String state mirrored in ?key=. `allowed` (optional) rejects stale/unknown values from old links. */
export function useUrlState<T extends string>(key: string, initial: T, allowed?: readonly string[]): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const p = readParam(key);
    if (p !== null && (!allowed || allowed.includes(p))) setV(p as T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((n: T) => { setV(n); writeParam(key, n === initial ? null : n); }, [key, initial]);
  return [v, set];
}

/** Numeric id (e.g. an open donor record) mirrored in ?key=; null removes it. */
export function useUrlId(key: string): [number | null, (v: number | null) => void] {
  const [v, setV] = useState<number | null>(null);
  useEffect(() => { const p = Number(readParam(key)); if (Number.isInteger(p) && p > 0) setV(p); }, [key]);
  const set = useCallback((n: number | null) => { setV(n); writeParam(key, n === null ? null : String(n)); }, [key]);
  return [v, set];
}
