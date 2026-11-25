import { noteDashboardRefreshResponse, dashboardReadStatus } from "../dashboard-ready.client";
import { campaignBody, campaignReceipt, campaignStatus, campaignStatusBody, type CampaignBody } from "./pvas-native-mutation-v3";
const KEY = "pvas:campaign-change:v3:nativeCampaignMutationV3";
const uncertain = "This change is not yet confirmed. Check its status before making another change.";
/** Exact PUBLIC original intent only; never credentials, private evidence or
 * capabilities. Scope is fixed PVAS/version/operation; browser storage is not
 * trusted authority. Malformed storage fails closed and is never overwritten. */
export function pendingCampaignChange(): CampaignBody | null {
  const wire = sessionStorage.getItem(KEY);
  return wire === null ? null : campaignBody(JSON.parse(wire));
}
export function newCampaignRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
}
async function send(url: string, body: unknown) {
  if (url !== "/api/pvas-data-v2") throw new Error("Gift change is outside this dashboard.");
  const response = await fetch(url, { method: "POST", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  noteDashboardRefreshResponse("pvas", response); return response;
}
/** A pending/absent/error status NEVER clears intent or authorizes retry. */
export async function checkCampaignChange(url: string) {
  if (url !== "/api/pvas-data-v2") throw new Error("Gift change is outside this dashboard.");
  const body = pendingCampaignChange();
  if (!body) throw new Error("No saved gift change is available to check.");
  const r = await send(url, campaignStatusBody(body));
  if (!r.ok) throw new Error(uncertain);
  const result = await campaignStatus(await r.json(), body);
  if (result.status === "committed") sessionStorage.removeItem(KEY);
  return result;
}
export async function submitCampaignChange(url: string, input: CampaignBody) {
  if (dashboardReadStatus("pvas") !== "current") throw new Error("Dashboard view is not current. Retry the dashboard read before saving. Do not resubmit an accepted change.");
  if (url !== "/api/pvas-data-v2") throw new Error("Gift change is outside this dashboard.");
  const body = campaignBody(input);
  if (pendingCampaignChange()) throw new Error(uncertain);
  // Persist BEFORE sending; failures to retain intent prevent the write.
  sessionStorage.setItem(KEY, JSON.stringify(body));
  try {
    const r = await send(url, body);
    if (!r.ok) {
      // Even a definite validation refusal does not silently discard a saved
      // original intent. Reconciliation/reset requires an explicit decision.
      throw new Error(uncertain);
    }
    const receipt = await campaignReceipt(await r.json(), body);
    sessionStorage.removeItem(KEY);
    return receipt;
  } catch { throw new Error(uncertain); }
}
