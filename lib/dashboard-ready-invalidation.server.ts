import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PortalClient } from "./portal-v2/clients";

const mutation = new AsyncLocalStorage<{ failedAt?: number }>();
export const dashboardRefreshUnconfirmed = () => mutation.getStore()?.failedAt;
/** Only after an authoritative committed receipt. Failure is NOT SQL rollback.
 * A response-scoped warning preserves strict receipt JSON and replay identity. */
export async function invalidateCommittedDashboard(client: PortalClient) {
  try {
    if (client === "pvas") await (await import("./pvas-data-store")).invalidatePvasDataCache();
    else await (await import("./client-live-data.server")).invalidateLive(client);
  } catch {
    const scope = mutation.getStore();
    if (!scope) throw Error("Committed SQL; dashboard refresh unconfirmed. Do not resubmit.");
    scope.failedAt = Date.now();
  }
}
export function withDashboardMutationRefresh<A extends unknown[], R extends Response>(run: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> => mutation.run({}, async () => {
    const response = await run(...args);
    const failedAt = dashboardRefreshUnconfirmed();
    if (failedAt) {
      response.headers.set("X-Dashboard-Refresh", "unconfirmed");
      response.headers.set("X-Dashboard-Refresh-After", String(failedAt));
    }
    return response;
  });
}
