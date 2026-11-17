import { pvasCanonicalEnabled } from "./pvas-canonical";
import { PROSPECT_STATUSES } from "../pvas-tracking-types";

export interface CanonicalTrackingPresence {
  readonly objectPresent: boolean;
  readonly statusPresent: boolean;
}
type Carrier = { status?: string | null; _canonicalTracking?: CanonicalTrackingPresence };
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value,key);
const object = (value: unknown): value is Record<string,unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function validCanonicalTrackingProspect(value: unknown): boolean {
  if (!object(value) || !object(value._canonicalTracking)) return false;
  const p=value._canonicalTracking;
  return Object.keys(p).length===2 && own(p,"objectPresent") && own(p,"statusPresent") &&
    typeof p.objectPresent==="boolean" && typeof p.statusPresent==="boolean" &&
    (!p.statusPresent || p.objectPresent) && p.statusPresent===own(value,"status") &&
    (!own(value,"status") || value.status===null || typeof value.status==="string") &&
    ["solicitor","solicitor2"].every(key=>own(value,key) && typeof value[key]==="string");
}
function requireCarrier(value: unknown): asserts value is Carrier {
  if (!validCanonicalTrackingProspect(value)) throw new Error("Canonical tracking presence unavailable");
}
export function trackingObjectPresent(client: string, value: Carrier | undefined): boolean {
  if (!pvasCanonicalEnabled(client)) return !!value;
  requireCarrier(value);
  return value._canonicalTracking!.objectPresent;
}
export function trackingFormStatus(client: string, value: Carrier | undefined): string {
  if (pvasCanonicalEnabled(client)) requireCarrier(value);
  return value?.status ?? "Active"; // Local form value ONLY, never implicit save intent.
}
export function trackingStatusPatch(client: string, value: string, edited: boolean) {
  return pvasCanonicalEnabled(client) && !edited ? {} : {status:value};
}
/** Website partial-form boundary, NOT the full-state backend writer. Metadata
 * always comes from current validated state, never this partial request. */
export function canonicalTrackingStatusIntent(previous: unknown, request: Record<string,unknown>) {
  requireCarrier(previous);
  if (own(request,"_canonicalTracking")) throw new Error("Tracking presence is read-only");
  if (!own(request,"status")) return {changed:false,patch:{}};
  const changed = !own(previous,"status") || request.status!==previous.status;
  if (changed && (typeof request.status!=="string" || !PROSPECT_STATUSES.some(status=>status===request.status)))
    throw new Error("Choose an existing tracking status");
  return {changed,patch:{status:request.status as string|null}};
}
