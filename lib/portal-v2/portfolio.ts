import { assignmentMembers, belongsToSolicitor, isCampaignProspect, type Assignment } from "./effective-assignment";

export type PortfolioRow = { cptid: number } & Partial<Assignment>;
/** The paired index supplies the effective ask; never fall back to a pool rating,
 * source portfolio, or a truthy check that could revive an explicit zero/blank. */
export type PortfolioAskRow = PortfolioRow & { campaignAsk?: { ask?: number | null; askBlank?: boolean; askConflict?: boolean; askEdited?: boolean } };
export const portfolioAsk = (row: PortfolioAskRow): number => row.campaignAsk?.askConflict || row.campaignAsk?.askBlank ? 0 : row.campaignAsk?.ask ?? 0;

export type PortfolioSummary = {
  solicitor: string; prospects: number; primary: number; secondary: number;
  withAsk: number; askTotal: number; askReview: number; askMissing: number;
};

/** Selection always starts with the full paired assignment index. Status is not
 * an assignment filter. Shared by the UI and authoritative export reconstruction. */
export function portfolioModel<I extends PortfolioRow>(
  index: readonly I[], getAsk: (row: I) => number, solicitor = "",
) {
  const assigned = index.filter(isCampaignProspect);
  const solicitors = Array.from(new Set(assigned.flatMap(assignmentMembers))).sort((a, b) => a.localeCompare(b));
  const asks = new Map(assigned.map(row => [row.cptid, getAsk(row)]));
  const total = (rows: I[]) => ({
    assigned: rows.length,
    withAsk: rows.filter(row => (asks.get(row.cptid) ?? 0) > 0).length,
    askReview: rows.filter(row => (row as PortfolioAskRow).campaignAsk?.askConflict).length,
    askMissing: rows.filter(row => !(row as PortfolioAskRow).campaignAsk?.askConflict && ((row as PortfolioAskRow).campaignAsk?.askBlank || (row as PortfolioAskRow).campaignAsk?.ask == null)).length,
    askTotal: rows.reduce((sum, row) => sum + (asks.get(row.cptid) ?? 0), 0),
  });
  const summary: PortfolioSummary[] = solicitors.map(name => {
    const members = assigned.filter(row => belongsToSolicitor(row, name));
    const primary = members.filter(row => isCampaignProspect({ solicitor: row.solicitor }) && belongsToSolicitor({ solicitor: row.solicitor }, name)).length;
    const secondary = members.filter(row => isCampaignProspect({ solicitor2: row.solicitor2 }) && belongsToSolicitor({ solicitor2: row.solicitor2 }, name)).length;
    const stats = total(members);
    return { solicitor: name, prospects: members.length, primary, secondary, withAsk: stats.withAsk, askTotal: stats.askTotal, askReview: stats.askReview, askMissing: stats.askMissing };
  });
  const rows = solicitor ? assigned.filter(row => belongsToSolicitor(row, solicitor)) : assigned;
  return { assigned, solicitors, rows, summary, stats: total(rows) };
}
