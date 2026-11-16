/** Only an explicit edit can promote displayed Access/source fallback into manual ownership. */
export function manualAssignmentPatch(solicitor: string, solicitor2: string, primaryEdited: boolean, secondaryEdited: boolean) {
  return { ...(primaryEdited ? { solicitor } : {}), ...(secondaryEdited ? { solicitor2 } : {}) };
}
