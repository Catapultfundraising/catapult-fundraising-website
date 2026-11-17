import type { PortalClient } from "./clients";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import { assignmentSnapshot, type Assignment, type AssignmentTracking } from "./effective-assignment";
import { askEdits, overlayCampaignAsks } from "./effective-ask";
import { buildOverlay, finalId, type UpdateRow } from "./record-overlay";
import { directSnapshot, type DirectClientView } from "./direct-snapshot";
import { pvasContactProfile } from "./pvas-contact-wire";

/** Exact visible dashboard composition; shared with authoritative table exports. Financial arrays remain excluded. */
export function currentDashboardSnapshot<T extends object>(
  client: PortalClient, snapshot: T, index: ({ cptid: number } & Partial<Assignment>)[] | null,
  tracking: AssignmentTracking | undefined, updates: UpdateRow[], directView?: DirectClientView | null,
): T {
  const overlay = buildOverlay(updates);
  const source = directSnapshot(snapshot, pvasCanonicalEnabled(client) ? null : directView, client !== "wcbhc" && client !== "baq");
  const asks = pvasCanonicalEnabled(client) ? source :
    overlayCampaignAsks(source, overlay, askEdits(updates), client !== "wcbhc" && client !== "baq");
  const assigned = tracking ? assignmentSnapshot(asks, index, tracking, overlay) : asks;
  if (!pvasCanonicalEnabled(client)) return assigned;
  if (!index || !tracking) throw new Error("Current canonical ask index/tracking unavailable");
  const byId = new Map(index.map(row=>[row.cptid,row]));
  if (byId.size!==index.length) throw new Error("Ambiguous canonical ask index");
  type Row = {cptid?:number|null;ask?:number;rating?:number;active?:boolean;[key:string]:unknown};
  const own = (row:Row, pool=false):Row => {
    if (row.cptid==null) return row; // A board entry without a constituent is not a canonical identity.
    if (!Number.isInteger(row.cptid) || row.cptid<=0) throw new Error("Invalid canonical ask identity");
    const id=finalId(overlay,row.cptid), source=byId.get(id) as { _canonicalContact?:unknown } | undefined;
    const profile=pvasContactProfile(source?._canonicalContact,id),raw=profile.fields.ask;
    if (!Object.hasOwn(profile.fields,"ask") || raw!==null && (typeof raw!=="number" || !Number.isFinite(raw)))
      throw new Error("Invalid raw canonical ask");
    const out:Row={...row,ask:raw??0,...(pool?{rating:raw??0}:{})};
    // These old source flags do not describe the current SQL owner. Numeric
    // snapshot cells remain presentation only, not historical edit attribution.
    for (const key of ["askEdited","askBlank","askConflict","askFromCptid","directAskPresent","directManualAskPresent"])
      delete out[key];
    return out;
  };
  const s=assigned as T & {pool:Row[];portfolio?:Row[];board:Row[]};
  return {...s,pool:s.pool.map(row=>own(row,true)).filter(row=>(row.ask??0)>0),
    ...(s.portfolio?{portfolio:s.portfolio.map(row=>own(row))}:{}),
    board:s.board.map(row=>row.active?own(row):row)};
}
