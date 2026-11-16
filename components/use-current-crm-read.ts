"use client";
import { useCallback, useEffect, useRef } from "react";
import { viewAssignment, type AssignmentTracking } from "@/lib/portal-v2/effective-assignment";
export function currentAssignmentIndex<I extends { cptid: number }>(index: I[] | null, tracking: AssignmentTracking): I[] | null {
  if (!index) return null;
  return Object.assign(index.map(r => ({ ...r, ...viewAssignment(r, index, tracking) })), { directSourceRevision: (index as I[] & { directSourceRevision?: string }).directSourceRevision });
}
/** Pair whole index + strict tracking metadata; never call a failed tracking read EMPTY.
 * Manual save responses invalidate older fetches so an in-flight read cannot undo an in-session clear. */
export function useCurrentCrmRead<I, T>(client: string, setIndex: (v: I[] | null) => void, setTracking: (v: T) => void, setLoading: (v: boolean) => void) {
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const id = ++generation.current;
      try {
        const [rr, tr] = await Promise.all([fetch(`/api/${client}-data-records`, { cache: "no-store" }), fetch(`/api/${client}-data-tracking`, { cache: "no-store" })]);
        if (!rr.ok || !tr.ok) throw new Error("Current records/tracking unavailable");
        const [records, tracking] = await Promise.all([rr.json(), tr.json()]);
        if (!Array.isArray(records.index) || (records.directSourceRevision && records.directSourceRevision !== tracking.directSourceRevision)) throw new Error("Source layers changed during read");
        if (active && id === generation.current) {
          if (records.directSourceRevision) Object.defineProperty(records.index, "directSourceRevision", { value: records.directSourceRevision });
          setTracking(tracking); setIndex(records.index);
        }
      } catch { if (active && id === generation.current) setIndex(null); }
      finally { if (active && id === generation.current) setLoading(false); }
    };
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("crm-index-refresh", refresh);
    return () => { active = false; generation.current++; window.removeEventListener("crm-index-refresh", refresh); };
  }, [client, setIndex, setTracking, setLoading]);
  return useCallback((next: T) => { generation.current++; setTracking(next); }, [setTracking]);
}
