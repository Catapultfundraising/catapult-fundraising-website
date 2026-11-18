import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
/** This switch grants no backend capability. Backend readiness still fails
 * closed independently before SQL. Never derive write authority from HTML. */
export const pvasNativeWriteAccepted = () => pvasCanonicalEnabled("pvas");
