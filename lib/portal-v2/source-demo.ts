// FICTIONAL demo state for local preview only (route refuses unless demoAllowed()). No real donor data.
import { registryDests, type OverlayMark } from "./source-reconcile";
export function demoSourceState(client: string, table: string) {
  const cols = registryDests(client, table).filter((d) => d.st === "candidate" && d.col !== d.key).map((d) => d.col);
  const rec = (v: string) => Object.fromEntries(cols.map((c) => [c, v]));
  const baseline = new Map<number, Record<string, string | null>>([[900001, rec("A")], [900002, rec("A")], [900003, rec("A")]]);
  const current = new Map<number, Record<string, string | null>>([[900001, rec("A")], [900002, rec("Edited in portal")], [900003, rec("A")], [900004, rec("A")]]);
  const overlays: OverlayMark[] = cols[0] ? [{ key: 900003, col: cols[0], provenance: "manual" }, { key: 900009, col: null, provenance: "manual" }] : [];
  return { baseline, current, overlays };
}
