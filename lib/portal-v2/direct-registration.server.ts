import "server-only";
import type { PortalClient } from "./clients";
import { directSourceConfigured } from "./direct-source-transport.server";
/** Reviewed website pairing metadata, not SQL identifiers/authority. */
export interface WebsiteDirectRegistration {
  client: PortalClient; template: string;
  /** Only exact reviewed source aliases; never infer staff identities from donor data. */
  solicitorAliases: Readonly<Record<string, string>>;
}
/** All five employee dashboards use the same reviewed notes/ask template.
 * Backend remains sole authority for per-client identity, revision and cutovers.
 * No inferred staff aliases; matching transport/backend availability is required. */
export const APPROVED_WEBSITE_DIRECT_REGISTRATIONS: readonly WebsiteDirectRegistration[] = Object.freeze([
  Object.freeze({ client: "jag", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
  Object.freeze({ client: "csnf", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
  Object.freeze({ client: "pvas", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
  Object.freeze({ client: "wcbhc", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
  Object.freeze({ client: "baq", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
]);
/** Acceptance of this code path, NOT deployment/configuration or import approval.
 * Missing/malformed existing source transport configuration leaves every client OFF. */
export const DIRECT_WEBSITE_INTEGRATION_ACCEPTED = true;
export const directLaneEnabled = (client: PortalClient) => DIRECT_WEBSITE_INTEGRATION_ACCEPTED && directSourceConfigured() && APPROVED_WEBSITE_DIRECT_REGISTRATIONS.some(r => r.client === client);
