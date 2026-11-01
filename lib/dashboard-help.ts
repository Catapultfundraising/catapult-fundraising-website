// In-dashboard Help content for the five employee data dashboards (JAG, CSNF, PVAS, WCBHC, BAQ).
// Every claim here is checked against the current components (see the source-to-topic map in the PR).
// Keep wording client-safe: no passwords, keys, internal systems or real donor examples.

export type HelpClient = "jag" | "csnf" | "pvas" | "wcbhc" | "baq";

/** Tabs exactly as each dashboard renders them (its TABS constant plus Prospect Ratings). Tested against the source. */
export const DASHBOARD_TABS: Record<HelpClient, readonly string[]> = {
  jag: ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Board", "Calling", "Feasibility", "Database Health", "Campaign Donors", "Add + Upload", "Prospect Ratings"],
  csnf: ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Board", "Calling", "Database Health", "Alumni", "Campaign Donors", "Add + Upload", "Prospect Ratings"],
  pvas: ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Board", "Portfolio", "Recent Givebutter Activity", "Database Health", "Campaign Donors", "Add + Upload", "Prospect Ratings"],
  wcbhc: ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Committee", "Campaign Prospects", "Campaign Gifts", "Database Health", "Campaign Donors", "Add + Upload", "Prospect Ratings"],
  baq: ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Reports", "Committee", "Campaign Prospects", "Campaign Gifts", "Database Health", "Campaign Donors", "Add + Upload", "Prospect Ratings"],
};

export interface HelpTopic {
  id: string;
  title: string;
  /** "section" topics belong to one dashboard tab; "task" topics are shared how-tos used from several tabs. */
  kind: "section" | "task";
  /** The tab this topic explains (section topics). */
  tab?: string;
  /** Limit to some dashboards; omitted = all five. */
  clients?: HelpClient[];
  summary: string;
  steps: string[];
  notes?: string[];
  /** Related task topic ids. */
  related?: string[];
}

const ALL_TOPICS: HelpTopic[] = [
  // ---------- Sections (one per tab) ----------
  {
    id: "donor-lookup", kind: "section", tab: "Donor Lookup", title: "Donor Lookup",
    summary: "Find any constituent and open their full record.",
    steps: [
      "Type a name, city or CPTID in the search box at the top of the page or on this tab.",
      "Click a result to open the donor record on the right.",
      "Scroll the record for contact details, the giving history on file, wealth screening and the client-specific sections.",
      "Close the record with the X or by pressing Escape.",
    ],
    notes: ["Merged and deleted records stay hidden from search. Use Database Health or Add + Upload to review merges and deletes."],
    related: ["record", "gifts-pledges"],
  },
  {
    id: "overview", kind: "section", tab: "Overview", title: "Overview",
    summary: "Campaign progress and the headline giving trends.",
    steps: [
      "Check the campaign progress bar at the top: it is the campaign total including pledges.",
      "Read the headline cards. Cards with underlined numbers can be clicked to see the list behind them.",
      "Use the giving, donor count and retention charts to compare years.",
      "Use the Recent years table, or the download buttons on a table, to export the figures.",
    ],
    notes: ["JAG and CSNF charts use fiscal years (July to June). PVAS, WCBHC and BAQ use calendar years."],
    related: ["gifts-pledges", "downloads"],
  },
  {
    id: "gift-pyramid", kind: "section", tab: "Gift Pyramid", title: "Gift Pyramid",
    summary: "Donors grouped by lifetime giving, wealth capacity and DS rating.",
    steps: [
      "Click a band in the Lifetime giving pyramid to list the donors in it.",
      "Click a row in Capacity distribution to see prospects at that DonorSearch capacity.",
      "Click a bar in DS rating distribution (DS1 is strongest) to see those prospects.",
      "Scroll to Top donors for the top 250 donors by lifetime giving. Click a name to open the record.",
    ],
    related: ["record", "downloads"],
  },
  {
    id: "gift-chart", kind: "section", tab: "Gift Chart + GC2P", title: "Gift Chart + GC2P",
    summary: "The campaign gift chart and the prospects seated at each level (Gift Chart to Prospects).",
    steps: [
      "Check the campaign goal and gift chart shown at the top.",
      "Read each level: gifts, gift level, cumulative total, prospects needed and share of goal.",
      "Where a count can be clicked, click it to list the prospects whose amount falls in that band.",
      "Click a prospect name to open the donor record.",
      "Use the download buttons at the top of the dashboard for the complete branded PDF.",
    ],
    related: ["record", "downloads"],
  },
  {
    id: "prospects", kind: "section", tab: "Prospects", title: "Prospects",
    summary: "Ready-made prospect pools: major gift, mid-level, legacy call and reactivation.",
    steps: [
      "Pick a pool. The rule for each pool is printed under its title.",
      "Click a column heading to sort the list.",
      "Type in the list's filter box to narrow it.",
      "Click a name to open the donor record, or download the list.",
    ],
    notes: ["Need a custom list with your own fields and filters? Use the Reports tab."],
    related: ["reports-build", "downloads"],
  },
  {
    id: "reports", kind: "section", tab: "Reports", title: "Reports",
    summary: "Build your own prospect report: choose fields, add filters, sort, keep the top rows, then download to Excel or PDF.",
    steps: [
      "Click Choose fields and tick the columns you want. Click Done.",
      "Click Add filter. Choose a field, a condition and a value. Dates use MM/DD/YYYY.",
      "Use the search box to narrow by name, CPTID, city or email.",
      "Click a column heading to sort.",
      "Optional: enter a number in \u201cKeep only the top __ rows after filters and sort\u201d.",
      "Click PDF or Excel. The file includes every matching row (not just the preview), with your selected fields, filters, sort and top-rows limit, within the size limits below.",
    ],
    notes: [
      "The on-screen table previews up to the first 500 matching rows; the record count shows the full total.",
      "A filter with an invalid number or date is outlined in red and the list does not update until it is fixed.",
      "Capacity is shown as written. \u201cCapacity minimum (parsed)\u201d reads common ranges (for example $500K-$1M as $500,000) and is blank when the text can't be read.",
      "PDF downloads are limited to 5,000 rows and Excel to 60,000. Add a filter if a list is larger."
    ],
    related: ["reports-build", "shared-lists", "downloads", "troubleshooting"],
  },
  {
    id: "board", kind: "section", tab: "Board", title: "Board", clients: ["jag", "csnf", "pvas"],
    summary: "Board campaign ask versus commitments, with giving history and DonorSearch.",
    steps: [
      "Read the headline cards: active board members, campaign ask total, committed so far and members who have given.",
      "Sort the Board report table by clicking a column heading.",
      "Click a member's name to open their record.",
    ],
    related: ["record", "downloads"],
  },
  {
    id: "committee", kind: "section", tab: "Committee", title: "Committee", clients: ["wcbhc", "baq"],
    summary: "Campaign committee members with their pledges and gifts on file.",
    steps: [
      "Review the Committee giving table.",
      "Click a column heading to sort.",
      "Click a member's name to open their record.",
    ],
    related: ["record", "gifts-pledges"],
  },
  {
    id: "portfolio", kind: "section", tab: "Portfolio", title: "Portfolio", clients: ["pvas"],
    summary: "The campaign portfolio and solicitor assignments.",
    steps: [
      "Check Solicitor assignments to see how the portfolio is split by Primary Solicitor.",
      "Review Campaign portfolio: every prospect, largest Campaign Ask first.",
      "Click a name to open the record. Campaign tracking (solicitor, status, ask) is edited in the record.",
    ],
    related: ["record"],
  },
  {
    id: "campaign-prospects", kind: "section", tab: "Campaign Prospects", title: "Campaign Prospects", clients: ["wcbhc", "baq"],
    summary: "Prospects seated on the campaign gift chart, plus the pipeline not yet seated.",
    steps: [
      "Check Solicitor assignments for seated prospects by committee solicitor or connection.",
      "Review Campaign prospects, largest gift level first.",
      "Scroll to Pipeline, not yet seated, and Not seated (with the reason).",
      "Click a name to open the record.",
    ],
    related: ["record"],
  },
  {
    id: "givebutter", kind: "section", tab: "Recent Givebutter Activity", title: "Recent Givebutter Activity", clients: ["pvas"],
    summary: "Online gifts, pledges and transactions from Givebutter.",
    steps: [
      "Review Gifts by campaign for successful online gifts.",
      "Check Pledges, largest first.",
      "Use Transactions for every Givebutter transaction, newest first.",
    ],
    notes: ["Givebutter activity is shown separately and is not included in lifetime giving totals."],
    related: ["gifts-pledges"],
  },
  {
    id: "campaign-gifts", kind: "section", tab: "Campaign Gifts", title: "Campaign Gifts", clients: ["wcbhc", "baq"],
    summary: "Campaign gifts by payment type, committee pledges and every campaign gift.",
    steps: [
      "Review Gifts by type.",
      "Check Pledges for committee pledges and verbal commitments, largest first.",
      "Use Gifts for every campaign gift, newest first.",
    ],
    related: ["gifts-pledges"],
  },
  {
    id: "calling", kind: "section", tab: "Calling", title: "Calling", clients: ["jag", "csnf"],
    summary: "Prospects sent for feasibility study interview appointments.",
    steps: [
      "Review the calling batches by study tier.",
      "Click a batch to list the prospects sent in it.",
      "Use the full list below to find anyone sent to calling, and click a name to open the record.",
    ],
    notes: ["CSNF live call outcomes are on the CSNF Study Dashboard, not here."],
    related: ["record"],
  },
  {
    id: "feasibility", kind: "section", tab: "Feasibility", title: "Feasibility", clients: ["jag"],
    summary: "Feasibility study results by tier and every interview answer.",
    steps: [
      "Review Results by tier. Click a tier to list its study prospects.",
      "Read Interview answers for each study prospect.",
      "Click a name to open the donor record.",
    ],
    related: ["record"],
  },
  {
    id: "alumni", kind: "section", tab: "Alumni", title: "Alumni", clients: ["csnf"],
    summary: "Alumni records by school and top zip codes.",
    steps: ["Review By school.", "Check Top zip codes.", "Download a table with its download button."],
    related: ["downloads"],
  },
  {
    id: "database-health", kind: "section", tab: "Database Health", title: "Database Health",
    summary: "Record counts by donor type, affiliation flags and organization types.",
    steps: [
      "Review Donor type, Affiliation flags and Organization types.",
      "Use the counts to spot gaps before building lists.",
      "To find and merge duplicate records, go to Add + Upload.",
    ],
    related: ["merge-delete"],
  },
  {
    id: "campaign-donors", kind: "section", tab: "Campaign Donors", title: "Campaign Donors",
    summary: "Campaign gifts and pledges by gift-chart level, and where you record new ones.",
    steps: [
      "Review Campaign donors by gift-chart level: secured and remaining at each level.",
      "To add one, use Record a gift or pledge. Choose Gift or Pledge, enter the donor and amount, and pick the matching record (or save as a new donor).",
      "To fix one, enter your name above All campaign gifts and pledges, then click Edit. This changes the existing entry; it does not add a second one.",
      "To remove a duplicate or mistake, click Void and give a reason. Voided entries are listed separately and not counted.",
      "Download the list with Download Excel or Download PDF.",
    ],
    related: ["gifts-pledges", "downloads"],
  },
  {
    id: "add-upload", kind: "section", tab: "Add + Upload", title: "Add + Upload",
    summary: "Add prospects, upload client files, merge duplicates and review the change log.",
    steps: [
      "Add prospect: enter the details. If a likely match appears, choose it or click Add anyway.",
      "Upload client file: choose an Excel or CSV file, enter your name and click Preview.",
      "Check the preview (new, changed, unchanged, gifts and pledges). Nothing is saved until you click Confirm and save.",
      "Duplicate records: pick the record to keep, enter your name, then merge.",
      "Change log: see every upload and change. An upload can be undone from here.",
    ],
    notes: [
      "Adding an individual with a first name, last name and state automatically requests a DonorSearch wealth screening; results appear on the record within about 15 minutes.",
      "Prospects added here are listed at the bottom. Click Edit to fix a name, address or contact detail.",
    ],
    related: ["merge-delete", "troubleshooting"],
  },
  {
    id: "prospect-ratings", kind: "section", tab: "Prospect Ratings", title: "Prospect Ratings",
    summary: "Build the board prospect review list, invite board or committee members, and see their ratings.",
    steps: [
      "Open Prospect Ratings. It is available to signed-in dashboard users; if a sign-in box appears, your session needs to be renewed.",
      "Build the review list: either select prospects with filters (Option A) or upload a prospect list (Option B).",
      "Save the review list. Each dashboard has one review list; saving again asks before replacing it.",
      "Add or upload members, then send invites.",
      "Open Results to follow progress and download all results.",
    ],
    notes: [
      "This is separate from saved report lists on the Reports tab.",
      "Members sign in from their own invite and rate the saved review list."
    ],
    related: ["shared-lists"],
  },

  // ---------- Shared tasks ----------
  {
    id: "getting-started", kind: "task", title: "Getting started",
    summary: "What the header dates mean and a few rules before you edit.",
    steps: [
      "\u201cSource data as of\u201d is the date of the client data the dashboard was built from. \u201cSnapshot refreshed\u201d is when the dashboard last rebuilt it.",
      "Changes made on the dashboard (edits, gifts, uploads) show right away, even before the next refresh.",
      "CPTID is the dashboard's record number. It is not necessarily the ID in the client's own database (that is the Client ID).",
      "Before editing, check the name, address and CPTID to be sure you have the right person.",
      "Dashboard changes are saved in the dashboard. They are not written back to the client's own database.",
      "Capacity is a wealth estimate. It is not a pledge or an ask amount.",
    ],
    related: ["record", "gifts-pledges"],
  },
  {
    id: "record", kind: "task", title: "Open and edit a donor record",
    summary: "Clickable names across the dashboard open the same donor record.",
    steps: [
      "Click a highlighted name, or search at the top of the page.",
      "To change contact details, click Edit contact, enter your name and save. Replaced values are kept as old contact information.",
      "To change capacity or rating, use Edit in Wealth screening. The record shows where each value comes from (Edited, From PIR or DonorSearch).",
      "Log a contact or visit: choose the type, enter a date (MM/DD/YYYY) and notes.",
      "Wealth screening edits show who changed them, and can be reversed with Undo edit.",
    ],
    notes: ["Contact changes are kept when the data is refreshed each Monday."],
    related: ["gifts-pledges", "documents", "merge-delete"],
  },
  {
    id: "gifts-pledges", kind: "task", title: "Gifts versus pledges",
    summary: "How paid gifts and campaign pledges are counted.",
    steps: [
      "In a donor record, giving by year lists each gift. Grey amounts (pledges, refunds, pending) are listed but not added to the year total.",
      "The campaign progress bar and Campaign Donors include pledges and say so.",
      "In Reports, Lifetime giving comes from the client giving file and excludes campaign pledges. Campaign pledges and Campaign gifts received are separate fields.",
    ],
    related: ["record"],
  },
  {
    id: "documents", kind: "task", title: "PDF notes on a record",
    summary: "Keep meeting notes and other PDFs with a prospect.",
    steps: [
      "Open the record and find PDF notes.",
      "Choose one or several PDFs (up to 20 MB each).",
      "Click Open PDF to view one.",
      "Delete removes that PDF and its stored file after you confirm. This cannot be undone.",
    ],
    related: ["record"],
  },
  {
    id: "merge-delete", kind: "task", title: "Merge, delete and restore",
    summary: "Clean up duplicates safely. Every merge and delete can be undone.",
    steps: [
      "From a record, click Merge duplicate, pick the duplicate and give a reason. Contact info from merged records is kept.",
      "To delete a test or invalid record, click Delete, enter your name and a reason.",
      "A deleted record no longer shows in searches or lists. Bring it back with Restore record on the record, or from Merge and delete history.",
      "Merge and delete history (under Duplicate records in Add + Upload) lists each merge and delete so it can be undone.",
    ],
    related: ["add-upload"],
  },
  {
    id: "reports-build", kind: "task", title: "Build and download a report",
    summary: "Step-by-step for the Reports tab.",
    steps: [
      "Go to Reports and click Choose fields to pick columns.",
      "Add filters. Each filter has a field, a condition and a value.",
      "Sort by clicking a column heading.",
      "Optionally keep only the top rows (applied after filters and sort).",
      "Click Excel or PDF. The file uses the same fields, filters, sort and row limit.",
    ],
    notes: ["PDF is limited to 5,000 rows and Excel to 60,000 rows. For larger lists, add a filter or a top-rows limit."],
    related: ["shared-lists", "downloads"],
  },
  {
    id: "shared-lists", kind: "task", title: "Saved report lists",
    summary: "Save a report's fields, filters and sort so anyone at this client's dashboard can reopen it on any computer.",
    steps: [
      "Set up the report. Type a List name and your name (shown as saved by).",
      "Click Save as new list.",
      "To reopen, choose it from Shared saved lists.",
      "After changing filters, click Update list. Use Rename or Delete list as needed.",
      "If someone else changed the list first, the lists reload instead of overwriting their change.",
      "Lists saved earlier only on this browser are offered for Import so you can share them.",
    ],
    notes: [
      "Saved lists belong to one client's dashboard only.",
      "Saved report lists are separate from the Prospect Ratings review list.",
    ],
    related: ["reports-build", "troubleshooting"],
  },
  {
    id: "downloads", kind: "task", title: "Download Excel and PDF",
    summary: "Where to download data.",
    steps: [
      "Use the download buttons at the top of the dashboard for branded PDF and Excel files.",
      "Tables with a download button export that table.",
      "On Reports, the PDF and Excel buttons export your custom report.",
    ],
    related: ["reports-build"],
  },
  {
    id: "troubleshooting", kind: "task", title: "Troubleshooting",
    summary: "Common messages and what to do.",
    steps: [
      "\u201cYour session expired. Please sign in again.\u201d Reload the page and sign in.",
      "\u201cDashboard edits are unavailable right now, so downloads are paused.\u201d Wait a few minutes and try again.",
      "\u201cShared lists could not be loaded.\u201d Reports and downloads still work. Click Try again.",
      "\u201cCould not confirm the change.\u201d Reload the saved lists and check before trying again.",
      "A save asks for your name: enter it so the change is credited to you.",
      "No records match: remove a filter or clear the search box.",
    ],
  },
];

export function topicsFor(client: HelpClient): HelpTopic[] {
  return ALL_TOPICS.filter((t) => !t.clients || t.clients.includes(client));
}

/** Section topics in the dashboard's tab order. */
export function sectionTopicsFor(client: HelpClient): HelpTopic[] {
  const byTab = new Map(topicsFor(client).filter((t) => t.kind === "section").map((t) => [t.tab!, t]));
  return DASHBOARD_TABS[client].map((tab) => byTab.get(tab)).filter((t): t is HelpTopic => !!t);
}

export function taskTopicsFor(client: HelpClient): HelpTopic[] {
  return topicsFor(client).filter((t) => t.kind === "task");
}

export function topicForTab(client: HelpClient, tab: string | undefined): HelpTopic | undefined {
  return sectionTopicsFor(client).find((t) => t.tab === tab);
}

/** Case-insensitive search across title, summary, steps and notes. Every word must match. */
export function searchTopics(client: HelpClient, query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const all = [...sectionTopicsFor(client), ...taskTopicsFor(client)];
  if (!words.length) return all;
  return all.filter((t) => {
    const hay = [t.title, t.tab ?? "", t.summary, ...t.steps, ...(t.notes ?? [])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export const ALL_HELP_TOPICS = ALL_TOPICS;
