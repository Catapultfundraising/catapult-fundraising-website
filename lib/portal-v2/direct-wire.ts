// Type-only aliases from the exact backend-owned protocol; never runtime SQL or browser crypto.
import type { DirectFileBatch } from "./directFileProtocol";
export type {
  DirectFileField as DirectField, DirectFileCell as DirectCell,
  DirectFileBatch as DirectBatch, DirectFileDecision as DirectDecision,
  DirectFilePlan as DirectPlan, DirectFileStateValue as DirectValueView,
  DirectFileStateNote as DirectNoteView, DirectFileStateResponse as DirectState,
} from "./directFileProtocol";
export type DirectTarget = DirectFileBatch["mapping"][number]["target"];
