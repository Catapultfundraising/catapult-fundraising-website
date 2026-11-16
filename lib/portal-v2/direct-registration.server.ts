import "server-only";
import type { PortalClient } from "./clients";
/** Reviewed website metadata, not SQL identifiers/authority. No approved production templates yet. */
export interface WebsiteDirectRegistration {
  client: PortalClient; template: string;
  /** Only exact reviewed source aliases; never infer staff identities from donor data. */
  solicitorAliases: Readonly<Record<string, string>>;
}
export const APPROVED_WEBSITE_DIRECT_REGISTRATIONS: readonly WebsiteDirectRegistration[] = Object.freeze([]);
export const DIRECT_WEBSITE_INTEGRATION_ACCEPTED = false;
export const directLaneEnabled = (client: PortalClient) => DIRECT_WEBSITE_INTEGRATION_ACCEPTED && APPROVED_WEBSITE_DIRECT_REGISTRATIONS.some(r => r.client === client);
