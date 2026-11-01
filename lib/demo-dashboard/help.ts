// Help topics for the fictional sample dashboard (/demo-dashboard). Every step describes a control that
// exists in components/demo-data-dashboard.tsx; simulated features are labeled as such.
import type { HelpTopic } from "@/lib/dashboard-help";

export const DEMO_TABS = ["Overview", "Donor Lookup", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Committee", "Campaign Gifts", "Database Health", "Add + Upload", "Prospect Ratings"] as const;
export type DemoTab = (typeof DEMO_TABS)[number];

const SESSION = "Edits in this demo are kept only in this browser tab and are not shared with anyone else. Closing the tab or clicking Reset demo discards them (notes and saved report setups).";

export const DEMO_HELP_TOPICS: HelpTopic[] = [
  {
    id: "overview", kind: "section", tab: "Overview", title: "Overview",
    summary: "Campaign progress toward the goal, plus historical giving trends.",
    steps: [
      "Read the campaign bar: committed (pledges plus outright gifts) against the goal, and what remains to raise.",
      "Compare Committed, Received and Outstanding pledges. Received is money paid; Outstanding is pledged but not yet paid.",
      "Click an underlined card to see the list of records behind it.",
      "Click a bar in Giving by year, or a row of the Recent years table, to list donors who gave that year.",
    ],
    notes: ["Historical giving (annual fund, galas, events) is shown separately from campaign commitments.", "All figures are fictional sample data."],
    related: ["record", "downloads"],
  },
  {
    id: "donor-lookup", kind: "section", tab: "Donor Lookup", title: "Donor Lookup",
    summary: "Find any fictional constituent and open their record.",
    steps: [
      "Type part of a name, a city or an ID in the search box in the header or on this tab.",
      "Click a name to open the record.",
      "Close the record with the X or by pressing Escape.",
    ],
    related: ["record"],
  },
  {
    id: "gift-pyramid", kind: "section", tab: "Gift Pyramid", title: "Gift Pyramid",
    summary: "Records grouped by historical giving plus campaign commitments (pledged amounts, not only paid).",
    steps: ["Each bar is a band of historical giving + campaign commitments. Click a band to list the donors in it.", "Use the capacity table to see how many records sit in each capacity rating; click a row for the list."],
    related: ["record"],
  },
  {
    id: "gift-chart", kind: "section", tab: "Gift Chart + GC2P", title: "Gift Chart + GC2P",
    summary: "The gift chart for the goal, with commitments and open prospects seated at each level.",
    steps: [
      "Read each level: gifts needed, gifts committed at that level, and open prospects whose ask fits the level.",
      "Click a level's row to see one list: committed donors first, then open prospects.",
    ],
    notes: ["Commitments are seated at the highest level they meet. Prospects are seated by their proposed ask."],
  },
  {
    id: "prospects", kind: "section", tab: "Prospects", title: "Prospects",
    summary: "Open campaign prospects by stage, with proposed asks.",
    steps: ["Use the stage buttons to filter.", "Search or click a column header to sort; click again to reverse.", "Click a name to open the record.", "Use Excel or PDF to download the rows shown."],
    related: ["downloads"],
  },
  {
    id: "reports", kind: "section", tab: "Reports", title: "Reports",
    summary: "Build your own list from the fictional records: pick fields, filter, sort, limit and download.",
    steps: [
      "Add a field with its + button under the field list. Remove one with its X, and use the up and down arrows to change the order.",
      "Set filters: stage, donor type, solicitor, minimum capacity and campaign status.",
      "Choose a sort field and direction, and optionally keep only the top N rows.",
      "Click a name in the results to open the record.",
      "Click Excel or PDF to download the results. Downloads are marked as sample data.",
      "Type a name and click Save setup to keep the setup for this tab session; pick it from Saved setups to reload it.",
    ],
    notes: [SESSION, "In client dashboards, saved lists are shared with your team. In this demo they stay in this browser tab only."],
    related: ["downloads"],
  },
  {
    id: "committee", kind: "section", tab: "Committee", title: "Committee",
    summary: "Each campaign volunteer's portfolio: assigned prospects, commitments and open asks.",
    steps: ["Click a solicitor row to list their assigned records.", "Click a name to open the record."],
  },
  {
    id: "campaign-gifts", kind: "section", tab: "Campaign Gifts", title: "Campaign Gifts",
    summary: "Every campaign commitment with amount pledged, received and outstanding.",
    steps: ["Search or sort the table.", "Totals at the top reconcile to the campaign bar on Overview.", "Use Excel or PDF to download."],
    related: ["downloads"],
  },
  {
    id: "health", kind: "section", tab: "Database Health", title: "Database Health",
    summary: "Data-quality checks such as missing emails, possible duplicates and lapsed donors.",
    steps: ["Click a check to list the records it flags.", "Open a record to review it."],
  },
  {
    id: "add-upload", kind: "section", tab: "Add + Upload", title: "Add + Upload (preview)",
    summary: "Shows what adding prospects and uploading files looks like. In this demo nothing is uploaded or sent.",
    steps: ["Review the example activity log.", "The form controls are disabled in the demo."],
    notes: ["Demo preview: no uploads or invitations are sent."],
  },
  {
    id: "ratings", kind: "section", tab: "Prospect Ratings", title: "Prospect Ratings (preview)",
    summary: "Example of how committee members' prospect ratings roll up, with fictional members and answers.",
    steps: ["Read the A, B, C and D counts for each prospect: A = could be the primary solicitor, B = could be a secondary solicitor, C = can open the door, D = does not know them.", "Read members' comments, and see which members have completed the form.", "Click a name to open the record."],
    notes: ["Demo preview: no reviewer invitations are sent and the rating form itself is not available in the demo."],
  },
  {
    id: "record", kind: "task", title: "Use a donor record",
    summary: "Contact details, campaign pledge and payments, giving history and notes.",
    steps: [
      "Open a record by clicking any underlined name.",
      "Review the campaign pledge: pledged, received, outstanding and each payment.",
      "Add a note with Add note. Edit or delete notes with the links beside them.",
      "Under PDF notes, click Download sample notes PDF for a generated example. Uploading PDFs is disabled in the demo.",
      "Click Reset demo in the banner at the top to restore the original sample: added notes and saved report setups are cleared.",
    ],
    notes: [SESSION, "Emails and phone numbers are fictional and cannot be contacted."],
  },
  {
    id: "downloads", kind: "task", title: "Download Excel or PDF",
    summary: "Most tables offer Excel and PDF downloads of the rows shown.",
    steps: ["Search or filter the table first; downloads include only the rows shown.", "Click Excel or PDF. The file is created in your browser."],
    notes: ["Every download is labeled 'SAMPLE - fictional demo data'."],
  },
];

export function demoTopicForTab(tab?: string) { return DEMO_HELP_TOPICS.find((t) => t.kind === "section" && t.tab === tab); }
export function demoSearch(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return DEMO_HELP_TOPICS.filter((t) => { const hay = [t.title, t.summary, ...t.steps, ...(t.notes ?? [])].join(" ").toLowerCase(); return words.every((w) => hay.includes(w)); });
}
