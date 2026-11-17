import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import { collectNativeGiftPagesV2 } from "./pvas-native-gift-read";
import type { NativeLane, NativeView } from "./pvas-native-gift-wire";

/** Existing authenticated Engage read transport only. Backend still defaults
 * deny before SQL until its trusted native schema/capability context is wired. */
export async function readPvasNativeGiftsV2(lane: NativeLane, view: NativeView = "current") {
  if (!pvasCanonicalEnabled("pvas")) throw new Error("PVAS native reads are held");
  const secret = process.env.PORTAL_WRITE_SECRET;
  const url = process.env.ENGAGE_PORTAL_URL || "https://engage.catapultfr.com/api/portal-v2";
  if (!secret) throw new Error("PVAS native gift feed is not configured");
  return collectNativeGiftPagesV2("pvas", async body => {
    const response = await fetch(url, { method: "POST", cache: "no-store",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify(body) });
    if (!response.ok) throw new Error("PVAS native gift read unavailable");
    return response.json();
  }, { v: 2, lane, view, after: null, limit: 500 });
}
