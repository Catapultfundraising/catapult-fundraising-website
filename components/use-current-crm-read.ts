"use client";
import { loadDashboardReady, subscribeDashboardReady, invalidateDashboardReady } from "@/lib/dashboard-ready.client";
import { useCallback, useEffect, useRef } from "react";
import { viewAssignment, type AssignmentTracking } from "@/lib/portal-v2/effective-assignment";
export function currentAssignmentIndex<I extends { cptid: number }>(index: I[] | null, tracking: AssignmentTracking): I[] | null {
  if (!index) return null;
  return Object.assign(index.map(r => ({ ...r, ...viewAssignment(r, index, tracking) })), { directSourceRevision: (index as I[] & { directSourceRevision?: string }).directSourceRevision, dashboardGeneration: (index as I[] & { dashboardGeneration?: string }).dashboardGeneration });
}
/** Pair whole index + strict tracking metadata; never call a failed tracking read EMPTY.
 * Manual save responses invalidate older fetches so an in-flight read cannot undo an in-session clear. */
export function useCurrentCrmRead<I, T>(client: string, setIndex: (v: I[] | null) => void, setTracking: (v: T) => void, setLoading: (v: boolean) => void) {
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeDashboardReady(client, bundle => {
      if (active) { setTracking(bundle.tracking as T); setIndex(bundle.index as I[]); setLoading(false); }
    });
    const load = async () => {
      const id = ++generation.current;
      setLoading(true);
      try { await loadDashboardReady(client); }
      catch { if (active && id === generation.current) setIndex(null); }
      finally { if (active && id === generation.current) setLoading(false); }
    };
    void load();
    const refresh = () => { invalidateDashboardReady(client); void load(); };
    window.addEventListener("crm-index-refresh", refresh);
    return () => { active = false; unsubscribe(); window.removeEventListener("crm-index-refresh", refresh); };
  }, [client, setIndex, setTracking, setLoading]);
  return useCallback((next: T) => { generation.current++; invalidateDashboardReady(client); setTracking(next); setIndex(null); setLoading(true); void loadDashboardReady(client).catch(() => setLoading(false)); }, [client, setTracking, setIndex, setLoading]);
}
