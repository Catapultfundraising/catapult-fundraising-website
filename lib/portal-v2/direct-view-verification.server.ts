import "server-only";
import type { PortalClient } from "./clients";
import { observeDirect, directData } from "./direct-source-state.server";
import { DirectReadUnavailable } from "./direct-effective-state";
/** Ephemeral current-server-read check, NEVER a durable publication record or browser-render acceptance. */
export async function verifyCurrentDirectView(client: PortalClient): Promise<Record<string, unknown>> {
  const observed = await observeDirect(client);
  if (!observed) throw new DirectReadUnavailable();
  const loaders = {
    jag: () => import("../jag-data-store").then(m => Promise.all([m.getJagRecords(), m.getJagSnapshot()])),
    csnf: () => import("../csnf-data-store").then(m => Promise.all([m.getCsnfRecords(), m.getCsnfSnapshot()])),
    pvas: () => import("../pvas-data-store").then(m => Promise.all([m.getPvasRecords(), m.getPvasSnapshot()])),
    wcbhc: () => import("../wcbhc-data-store").then(m => Promise.all([m.getWcbhcRecords(), m.getWcbhcSnapshot()])),
    baq: () => import("../baq-data-store").then(m => Promise.all([m.getBaqRecords(), m.getBaqSnapshot()])),
  };
  const [records, raw] = await loaders[client]();
  if (!records || !raw || (records as unknown as { directSourceRevision?: string }).directSourceRevision !== observed.state.revision) throw new DirectReadUnavailable();
  const snapshot = await directData(client, raw, "snapshot");
  if ((snapshot as unknown as { directSourceRevision?: string }).directSourceRevision !== observed.state.revision) throw new DirectReadUnavailable();
  const expected = new Set([...observed.state.values, ...observed.state.notes].map(x => x.cptid));
  const indexed = new Set(records.index.map(x => x.cptid));
  for (const cptid of expected) if (!records.records[String(cptid)] || !indexed.has(cptid)) throw new DirectReadUnavailable();
  return { sourceCommitted: true, viewVerified: true, verificationScope: "current-server-read-only", revision: observed.state.revision,
    observedAt: new Date().toISOString(), durablePublicationReceipt: false,
    note: "Current server source/manual records and snapshot reads verified. Reload this dashboard to inspect the rendered view. Current browser-grid exports are reconstructed server-side from typed selections. This is not a durable publication receipt or full release acceptance." };
}
