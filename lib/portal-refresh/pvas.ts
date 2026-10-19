import {
  band, builtAt, dsField, capmin, cid, counter, loadedAsOf, money, mostCommon, pdate, Per,
  pirLinks, pyramid, round2, Row, rows, s, sortedItems, yearsAgo,
} from "./common";

// PVAS (Palm Valley Animal Society) builder. Reads Azure schema `pvas`.
// The Access MASTER / Master_Giving_History tables are scrambled and were not
// loaded, so per-donor totals come from giving_history_overview, yearly giving
// from calendar_year_giving (calendar years), and contacts from the campaign
// portfolio plus phone_numbers. Givebutter transactions and pledges are kept
// in their own "Recent Givebutter Activity" section and are NOT counted in any
// campaign / lifetime total.

const DS_KEYS: [string, string][] = [
  ["DS Rating", "DS_Rating"], ["Wealth-Based Capacity", "Wealth_Based_Capacity"], ["Quality Score", "Quality_Score"],
  ["RFM Total", "RFM_Total"], ["Major Gift Score", "Major_Gift_Score"], ["Real Estate Est", "Real_Estate_Est"], ["# Of Prop", "Of_Prop"],
  ["SEC Stock Value", "SEC_Stock_Value"], ["Date Searched", "Date_Searched"],
];

// Corrections Jeff made on 9/1 that did not survive the Access update (gc2p/clients/pvas/data.py).
const ASK_OVERRIDES: Record<number, number> = { 12984: 50_000 };

export async function buildPvas() {
  const q = (t: string) => rows(`SELECT * FROM pvas.[${t}] ORDER BY row_id`);
  const [ghoRows, cygRows, dsRows, phoneRows, noteRows, boardRows, commRows, portRows, gbIds, gbTx, gbPl, asOf] = await Promise.all([
    q("giving_history_overview"), q("calendar_year_giving"), q("donorsearch_results"), q("phone_numbers"), q("notes"),
    q("board_info"), q("campaign_committee"), q("portfolio"), q("givebutter_id_numbers"), q("givebutter_transactions"),
    q("givebutter_pledges"), loadedAsOf("pvas"),
  ]);
  const byC = (rr: Row[]) => { const m = new Map<number, Row>(); for (const r of rr) { const c = cid(r.CPTID); if (c !== null) m.set(c, r); } return m; };
  const gho = byC(ghoRows), ds = byC(dsRows), port = byC(portRows), phones = byC(phoneRows);
  const fullName = (r: Row) => [s(r.First_Name), s(r.Last_Name)].filter(Boolean).join(" ");
  const name = new Map<number, string>();
  for (const [c, r] of port) name.set(c, s(r.Account_Name) || fullName(r));
  for (const [c, r] of gho) if (!name.get(c)) name.set(c, s(r.Account_Name));
  for (const [c, r] of ds) if (!name.get(c)) name.set(c, fullName(r));

  // Calendar-year giving per donor.
  const cyg = new Map<number, Map<number, number>>();
  for (const r of cygRows) {
    const c = cid(r.CPTID); const y = cid(r.Calendar_Year); const a = money(r.SumOfGift_Amount);
    if (c === null || y === null || !a) continue;
    const m = cyg.get(c) ?? new Map<number, number>(); cyg.set(c, m); m.set(y, (m.get(y) ?? 0) + a);
  }

  // Per-donor summary from the Giving History Overview.
  const pd = new Map<number, Per>();
  for (const [c, r] of gho) {
    const total = money(r.Total_Gift_Amount);
    if (total <= 0) continue;
    pd.set(c, { total, n: Math.round(money(r.Total_of_Gifts)), first: pdate(r.First_Gift_Date), last: pdate(r.Last_Gift_Date),
      max: money(r.Largest_Gift_Amount), fys: new Set(cyg.get(c)?.keys() ?? []) });
  }
  const tot = [...pd.values()].reduce((a, p) => a + p.total, 0);
  const giftCount = [...pd.values()].reduce((a, p) => a + p.n, 0);

  // Calendar-year totals and retention (labelled "fy" for the shared chart code; these are calendar years).
  const byYear = new Map<number, { total: number; donors: Set<number> }>();
  for (const [c, m] of cyg) for (const [y, a] of m) {
    const x = byYear.get(y) ?? { total: 0, donors: new Set<number>() }; byYear.set(y, x); x.total += a; x.donors.add(c);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const fys = years.map((y) => ({ fy: y, total: round2(byYear.get(y)!.total), gifts: byYear.get(y)!.donors.size, donors: byYear.get(y)!.donors.size }));
  const retention: { fy: number; retained: number; prior: number; rate: number; new: number }[] = [];
  const seen = new Set<number>();
  for (const y of years) {
    const cur = byYear.get(y)!.donors; const prev = byYear.get(y - 1)?.donors;
    if (prev) {
      const retained = [...prev].filter((c) => cur.has(c)).length;
      retention.push({ fy: y, retained, prior: prev.size, rate: Math.round((retained / prev.size) * 1000) / 10, new: [...cur].filter((c) => !seen.has(c)).length });
    }
    for (const c of cur) seen.add(c);
  }

  const dsr = counter([...ds.values()].map((r) => s(r.DS_Rating) || "Unrated"));
  const capc = counter([...ds.values()].map((r) => s(r.Wealth_Based_Capacity) || "Unrated"));
  const capOf = (c: number) => s(ds.get(c)?.Wealth_Based_Capacity) || s(port.get(c)?.Wealth_Capacity);
  const person = (c: number) => {
    const p = pd.get(c); const d = ds.get(c);
    return { cptid: c, name: name.get(c) ?? "", lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "",
      largest: round2(p?.max ?? 0), years: p?.fys.size ?? 0, ds: s(d?.DS_Rating) || s(port.get(c)?.DS_Rating), capacity: capOf(c),
      capMin: capmin(capOf(c)), qs: s(d?.Quality_Score) };
  };
  const Y3 = yearsAgo(3);
  const pdE = [...pd.entries()];
  const hw = [...ds.keys()].filter((c) => capmin(ds.get(c)!.Wealth_Based_Capacity) >= 25000).map(person).sort((a, b) => b.capMin - a.capMin || b.lifetime - a.lifetime);
  const mid = pdE.filter(([, p]) => p.total >= 250 && p.total < 5000 && p.last && p.last >= Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const leg = pdE.filter(([, p]) => p.fys.size >= 4 && p.total < 25000).map(([c]) => person(c)).sort((a, b) => b.years - a.years || b.lifetime - a.lifetime);
  const lapsed = pdE.filter(([, p]) => p.total >= 1000 && p.last && p.last < Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const top = [...pdE].sort((a, b) => b[1].total - a[1].total).slice(0, 250).map(([c]) => person(c));

  const boardRowsSorted = [...boardRows].sort((a, b) => money(a.Order) - money(b.Order));
  const board = boardRowsSorted.map((r) => {
    const c = cid(r.CPTID); const p = c === null ? undefined : pd.get(c);
    const term = [pdate(r.Board_Start), pdate(r.Board_End)].filter(Boolean).join(" to ");
    return { cptid: c ?? undefined, name: s(r.Account_Name) || fullName(r), title: s(r.Board_Title) || (r.Executive_Committee_Member ? "Executive Committee" : "Member"),
      board: "Board of Directors", term, active: !r.No_Longer_Board, ask: c !== null ? money(port.get(c)?.Campaign_Ask) : 0, get: 0,
      lifetime: round2(p?.total ?? 0), last: p?.last ?? "", ds: c !== null ? person(c).ds : "", capacity: c !== null ? capOf(c) : "" };
  });
  const committee = [...commRows].sort((a, b) => money(a.Order) - money(b.Order)).map((r) => ({ cptid: cid(r.CPTID), name: s(r.Account_Name), title: s(r.Committee_Title) || s(r.Category) }));

  // Contacts: portfolio first, then Phone Numbers, then Givebutter (latest contact on file).
  const contact = new Map<number, Record<string, string>>();
  const addc = (c: number | null, kw: Record<string, unknown>) => {
    if (c === null) return;
    const ct = contact.get(c) ?? {}; contact.set(c, ct);
    for (const [k, v] of Object.entries(kw)) { const t = s(v); if (t && !ct[k]) ct[k] = t; }
  };
  const ph = (v: unknown) => { const t = s(v); return t.endsWith(".0") ? t.slice(0, -2) : t; };
  for (const [c, r] of port) addc(c, { street: [s(r.Address), s(r.Address2)].filter(Boolean).join(", "), city: r.City, state: r.State, zip: r.Zip_Code,
    phone: ph(r.Phone1), phone2: ph(r.Phone2), email: r.Email1, email2: r.Email2, title: r.Title });
  for (const [c, r] of phones) addc(c, { phone: ph(r.Phone1), phone2: ph(r.Phone2), phone3: ph(r.Phone3) });

  // Givebutter: contact id -> CPTID (dedupe the id table).
  const gb2c = new Map<string, number>();
  for (const r of gbIds) { const c = cid(r.CPTID); const g = s(cid(r.GiveButter_ID)); if (c !== null && g && !gb2c.has(g)) gb2c.set(g, c); }
  const gbName = (r: Row) => [s(r.First_Name), s(r.Last_Name)].filter(Boolean).join(" ") || s(r.Company) || s(r.Company_Name);
  const transactions = gbTx.map((r) => {
    const c = gb2c.get(s(cid(r.Contact_ID))) ?? null;
    if (c !== null) addc(c, { street: r.Address_Line_1, city: r.City, state: r.State, zip: r.Postal_Code, email: r.Email, phone: s(r.Phone).replace(/^\+1/, "") });
    return { cptid: c, name: (c !== null && name.get(c)) || gbName(r), date: pdate(r.Transaction_Date_UTC) ?? "", amount: round2(money(r.Amount)),
      campaign: s(r.Campaign_Title), fund: s(r.Fund_Name), status: s(r.Status_Friendly) || "Succeeded", dedication: s(r.Dedication_Name) };
  }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.amount - a.amount));
  const pledges = gbPl.map((r) => {
    const c = gb2c.get(s(cid(r.Givebutter_Contact_ID))) ?? null;
    return { cptid: c, name: (c !== null && name.get(c)) || gbName(r), pledged: pdate(r.Pledged_on) ?? "", amount: round2(money(r.Amount)),
      fulfilled: round2(money(r.Amount_Fulfilled)), remaining: round2(money(r.Amount_Remaining)), campaign: s(r.Campaign_Title),
      status: s(r.Status), frequency: s(r.Installment_Frequency), expected: pdate(r.Expected_Fulfillment_Date) ?? "" };
  }).sort((a, b) => b.amount - a.amount);
  const ok = transactions.filter((t) => t.status === "Succeeded");
  const gbDates = transactions.map((t) => t.date).filter(Boolean).sort();
  const givebutter = {
    from: gbDates[0] ?? "", to: gbDates[gbDates.length - 1] ?? "",
    transactions, pledges,
    txCount: ok.length, txTotal: round2(ok.reduce((a, t) => a + t.amount, 0)), txDonors: new Set(ok.map((t) => t.cptid ?? t.name)).size,
    matched: ok.filter((t) => t.cptid !== null).length,
    pledgeCount: pledges.length, pledgeTotal: round2(pledges.reduce((a, p) => a + p.amount, 0)),
    byCampaign: mostCommon(counter(ok.map((t) => t.campaign || "General"))).map(([k, n]) => ({ campaign: k, gifts: n, total: round2(ok.filter((t) => (t.campaign || "General") === k).reduce((a, t) => a + t.amount, 0)) })),
  };

  // Campaign portfolio -> GC2P pool (seated by Campaign Ask, Primary Solicitor only).
  const portfolio = [...port].map(([c, r]) => {
    const ask = ASK_OVERRIDES[c] ?? money(r.Campaign_Ask);
    return { cptid: c, name: name.get(c) ?? "", solicitor: s(r.Primary_Solicitor) || "Unassigned", ask, type: s(r.Record_Type),
      donorType: s(r.Donor_Type) || (pd.has(c) ? "" : "Non-Donor"), priority: s(r["2026_Solicitation_Priority"]), task: s(r.Task),
      lifetime: round2(pd.get(c)?.total ?? money(r.Total_Gift_Amount)), prevAsk: money(r.Previous_Campaign_Ask), capacity: capOf(c), ds: person(c).ds };
  }).sort((a, b) => b.ask - a.ask || b.lifetime - a.lifetime);
  const committed = portfolio.filter((p) => p.solicitor === "Stewardship" && p.ask > 0);
  const pool = portfolio.filter((p) => p.ask > 0 && p.solicitor !== "Stewardship" && p.solicitor !== "DQ")
    .map((p) => ({ ...person(p.cptid), rating: p.ask, basis: "Campaign Ask", ask: p.ask, solicitor: p.solicitor, donorType: p.donorType || "" }));

  const allc = new Set<number>([...gho.keys(), ...ds.keys(), ...port.keys()]);
  const has = (c: number, k: string) => Boolean(contact.get(c)?.[k]);
  const all = [...allc];
  const health = {
    records: allc.size, address: all.filter((c) => has(c, "street")).length, phone: all.filter((c) => has(c, "phone")).length,
    email: all.filter((c) => has(c, "email")).length, orgs: portRows.filter((r) => s(r.Record_Type) && s(r.Record_Type) !== "Individual").length,
    duplicates: 0, dsScreened: ds.size, constituents: allc.size, multiCptAccounts: 0,
  };
  const dtype = counter([...gho.values()].filter((r) => money(r.Total_Gift_Amount) > 0).map((r) => s(r.Donor_Type) || "Not coded"));
  const flags = { "Board (current or former)": boardRows.length, "Campaign committee": commRows.length, "Campaign portfolio": portRows.length,
    "Portfolio with a Campaign Ask": portfolio.filter((p) => p.ask > 0).length, "Givebutter contacts": gb2c.size };
  const otype = counter(portRows.map((r) => s(r.Record_Type) || "Not coded"));
  // "Giving by donor type" uses the stages chart.
  const stagesM = new Map<string, [number, number]>();
  for (const [c, p] of pd) { const k = s(gho.get(c)?.Donor_Type) || "Not coded"; const x = stagesM.get(k) ?? [0, 0]; x[0] += p.n; x[1] += p.total; stagesM.set(k, x); }

  const solicitors = [...new Set(portfolio.map((p) => p.solicitor))].sort();
  const batches = solicitors.map((sol) => {
    const ps = portfolio.filter((p) => p.solicitor === sol);
    return { batch: sol, count: ps.length, tiers: Object.fromEntries(counter(ps.map((p) => p.priority || "No priority"))),
      people: ps.map((p) => ({ cptid: p.cptid, name: p.name, tier: p.priority, interviewer: sol, lifetime: p.lifetime, ds: p.ds, ask: p.ask })) };
  });

  const snapshot = {
    pool, client: "Palm Valley Animal Society", asOf, builtAt: builtAt(), source: "",
    kpi: { total: round2(tot), gifts: giftCount, donors: pd.size, avg: round2(tot / Math.max(1, giftCount)), gho: round2(tot), cash: round2(tot), inkind: 0 },
    stages: [...stagesM].map(([k, v]) => ({ stage: k, gifts: v[0], total: round2(v[1]) })).sort((a, b) => b.total - a.total), fys, retention,
    pyramid: pyramid(pd), dsRating: sortedItems(dsr), capacity: [...capc.entries()].sort((a, b) => capmin(b[0]) - capmin(a[0])),
    highWealth: hw.slice(0, 300), highWealthCount: hw.length, midLevel: mid.slice(0, 300), midLevelCount: mid.length,
    legacy: leg.slice(0, 300), legacyCount: leg.length, lapsed: lapsed.slice(0, 300), lapsedCount: lapsed.length, top,
    board, committee, health, donorType: mostCommon(dtype), flags, orgTypes: mostCommon(otype), batches,
    portfolio, committed, givebutter,
    feasibility: { total: 0, completed: 0, declined: 0, consider: 0, multiYear: 0, leadership: 0, introduce: 0, byTier: [], people: [] },
  };

  // ---------------- records ----------------
  type Rec = { cptid: number; name: string; kind: string; contact: Record<string, string>; flags: string[]; ds: Record<string, string>;
    gifts: Record<string, unknown>[]; board: Record<string, unknown>[]; committees: string[]; calling: Record<string, unknown>[];
    calls: Record<string, unknown>[]; notes: string[]; summary: Record<string, unknown>; years?: { year: number; amount: number }[];
    givebutter?: Record<string, unknown>[]; portfolio?: Record<string, unknown> };
  const R = new Map<number, Rec>();
  const rec = (c: number): Rec => {
    let x = R.get(c);
    if (!x) R.set(c, (x = { cptid: c, name: name.get(c) ?? "", kind: "", contact: {}, flags: [], ds: {}, gifts: [], board: [], committees: [], calling: [], calls: [], notes: [], summary: {} }));
    return x;
  };
  for (const c of allc) rec(c);
  for (const [c, ct] of contact) if (R.has(c)) R.get(c)!.contact = ct;
  for (const [c, d] of ds) { const x = rec(c); x.ds = Object.fromEntries(DS_KEYS.map(([k, col]) => [k, dsField(col, d[col])])); x.kind = "Individual"; }
  for (const [c, m] of cyg) {
    const x = rec(c); x.years = [...m].sort((a, b) => b[0] - a[0]).map(([year, amount]) => ({ year, amount: round2(amount) }));
    x.gifts = x.years.map((y) => ({ date: String(y.year), amount: y.amount, stage: "Calendar year total", type: "", campaign: "" }));
  }
  for (const b of board) if (b.cptid !== undefined) rec(b.cptid).board.push({ board: b.board, title: b.title, term: b.term, active: b.active, ask: b.ask, get: 0 });
  for (const m of committee) if (m.cptid !== null) rec(m.cptid).committees.push(`Campaign committee${m.title ? ` (${m.title})` : ""}`);
  for (const p of portfolio) {
    const r = port.get(p.cptid)!; const x = rec(p.cptid); x.kind = p.type || x.kind;
    x.portfolio = { solicitor: p.solicitor, secondary: s(r.Secondary_Solicitor), ask: p.ask, prevAsk: p.prevAsk, priority: p.priority, task: p.task,
      due: pdate(r.Due_Date) ?? "", relationship: s(r.Relationship), naming: s(r.Naming_Opportunity), donorType: p.donorType };
    x.calling.push({ batch: "Campaign portfolio", tier: p.priority, interviewer: p.solicitor, appt: "" });
    for (const k of ["New_Notes", "Historical_Notes"]) if (s(r[k])) x.notes.push(s(r[k]));
  }
  for (const r of [...noteRows].sort((a, b) => money(a.Note_Order_Newest_to_Oldest) - money(b.Note_Order_Newest_to_Oldest))) {
    const c = cid(r.CPTID); if (c === null || !s(r.Note)) continue;
    const d = pdate(r.Date); rec(c).notes.push(d ? `${d}: ${s(r.Note)}` : s(r.Note));
  }
  for (const t of transactions) if (t.cptid !== null) (rec(t.cptid).givebutter ??= []).push({ type: "Gift", date: t.date, amount: t.amount, campaign: t.campaign, status: t.status });
  for (const p of pledges) if (p.cptid !== null) (rec(p.cptid).givebutter ??= []).push({ type: "Pledge", date: p.pledged, amount: p.amount, campaign: p.campaign, status: p.status });
  const lists: [string, Set<number | null>][] = [["Board", new Set(board.map((b) => b.cptid ?? null))], ["Campaign committee", new Set(committee.map((m) => m.cptid))],
    ["Campaign portfolio", new Set(port.keys())]];
  const index: Record<string, unknown>[] = [];
  for (const [c, x] of R) {
    x.flags = lists.filter(([, ss]) => ss.has(c)).map(([k]) => k);
    const p = pd.get(c); const d = x.ds; const cap = d["Wealth-Based Capacity"] || s(port.get(c)?.Wealth_Capacity);
    const sm = { lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "", largest: round2(p?.max ?? 0),
      years: p?.fys.size ?? 0, band: p ? band(p.total) : "No gifts", ghoTotal: p ? round2(p.total) : null };
    x.summary = sm;
    if (!x.name) x.name = `CPTID ${c}`;
    index.push({ cptid: c, name: x.name, kind: x.kind, city: x.contact.city ?? "", lifetime: sm.lifetime, gifts: sm.gifts, largest: sm.largest,
      last: sm.last, years: sm.years, band: sm.band, ds: d["DS Rating"] || s(port.get(c)?.DS_Rating), capacity: cap || (Object.keys(d).length ? "Unrated" : ""), capMin: capmin(cap) });
  }
  index.sort((a, b) => (b.lifetime as number) - (a.lifetime as number));
  const records = { asOf: builtAt(), index, records: Object.fromEntries([...R].map(([k, v]) => [String(k), v])) };
  return { snapshot, records, pirs: await pirLinks("pvas") };
}
