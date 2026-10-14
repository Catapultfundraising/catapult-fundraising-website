import {
  band, builtAt, dsField, capmin, cid, counter, loadedAsOf, money, mostCommon, pdate, Per,
  pirLinks, pyramid, round2, Row, rows, s, sortedItems, yearsAgo,
} from "./common";

// WCBHC (Washoe Children's Behavioral Health Center) builder. Reads Azure schema `wcbhc`.
// Gifts: giving_history = $12M campaign gifts; non_campaign_giving_history = gifts to the
// Nevada Cares Campus (prior comparable campaign). Lifetime = both. GC2P seating is the
// curated committee seating (gc2p_prospects, from skills/gc2p/clients/wcbhc/data.py).
// PIR links come from wcbhc.pir_links (filled by Viktor's SharePoint matching).

const DS_KEYS: [string, string][] = [
  ["DS Rating", "DS_Rating"], ["Wealth-Based Capacity", "Wealth_Based_Capacity"], ["Quality Score", "Quality_Score"],
  ["RFM Total", "RFM_Total"], ["Real Estate Est", "Real_Estate_Est"], ["# Of Prop", "Of_Prop"],
  ["SEC Stock Value", "SEC_Stock_Value"], ["Date Searched", "Date_Searched"],
];
const COMMITTED = new Set(["Received", "Pledged", "Verbal", "Committed"]);
export const SYNTH_BASE = 900_000; // seated prospects with no CPTID get a stable synthetic id

type G = { c: number | null; a: number; d: string | null; src: "campaign" | "cares"; name: string; type: string; reason: string };

export async function buildWcbhc() {
  const q = (t: string) => rows(`SELECT * FROM wcbhc.[${t}] ORDER BY row_id`);
  const [mRows, dsRows, ghRows, ncRows, cgRows, crRows, gpRows, unRows, nsRows, asOf] = await Promise.all([
    q("master"), q("donorsearch_results"), q("giving_history"), q("non_campaign_giving_history"), q("committee_giving"),
    q("committee_ratings"), q("gc2p_prospects"), q("gc2p_unrated"), q("gc2p_not_seated"), loadedAsOf("wcbhc"),
  ]);
  const byC = (rr: Row[]) => { const m = new Map<number, Row>(); for (const r of rr) { const c = cid(r.CPTID); if (c !== null && !m.has(c)) m.set(c, r); } return m; };
  const master = byC(mRows), ds = byC(dsRows);
  const fullName = (r: Row) => [s(r.First_Name), s(r.Last_Name)].filter(Boolean).join(" ");
  const name = new Map<number, string>();
  for (const [c, r] of master) name.set(c, s(r.Account_Name) || fullName(r));
  for (const [c, r] of ds) if (!name.get(c)) name.set(c, fullName(r));

  const gifts: G[] = [
    ...ghRows.map((r) => ({ c: cid(r.CPTID), a: money(r.Gift_Amount), d: pdate(r.Date), src: "campaign" as const, name: s(r.Donor_Name), type: s(r.Type), reason: s(r.Reason_Description) })),
    ...ncRows.map((r) => ({ c: cid(r.CPTID), a: money(r.Donation_Amount), d: pdate(r.Donation_Date), src: "cares" as const, name: s(r.Name), type: "", reason: "" })),
  ].filter((g) => g.a);
  for (const g of gifts) if (g.c !== null && !name.get(g.c) && g.name) name.set(g.c, g.name);
  const yr = (d: string | null) => (d ? Number(d.slice(0, 4)) : null);

  const pd = new Map<number, Per>();
  for (const g of gifts) {
    if (g.c === null) continue;
    let p = pd.get(g.c);
    if (!p) pd.set(g.c, (p = { total: 0, n: 0, first: null, last: null, max: 0, fys: new Set() }));
    p.total += g.a; p.n += 1; p.max = Math.max(p.max, g.a);
    if (g.d) { if (!p.first || g.d < p.first) p.first = g.d; if (!p.last || g.d > p.last) p.last = g.d; p.fys.add(yr(g.d)!); }
  }
  const tot = gifts.reduce((a, g) => a + g.a, 0);
  const camp = gifts.filter((g) => g.src === "campaign");
  const campTot = camp.reduce((a, g) => a + g.a, 0);

  const byYear = new Map<number, { total: number; gifts: number; donors: Set<number> }>();
  for (const g of gifts) { const y = yr(g.d); if (y === null) continue; const x = byYear.get(y) ?? { total: 0, gifts: 0, donors: new Set<number>() }; byYear.set(y, x); x.total += g.a; x.gifts += 1; if (g.c !== null) x.donors.add(g.c); }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const fys = years.map((y) => ({ fy: y, total: round2(byYear.get(y)!.total), gifts: byYear.get(y)!.gifts, donors: byYear.get(y)!.donors.size }));
  const retention: { fy: number; retained: number; prior: number; rate: number; new: number }[] = [];
  const seen = new Set<number>();
  for (const y of years) {
    const cur = byYear.get(y)!.donors; const prev = byYear.get(y - 1)?.donors;
    if (prev && prev.size) {
      const retained = [...prev].filter((c) => cur.has(c)).length;
      retention.push({ fy: y, retained, prior: prev.size, rate: Math.round((retained / prev.size) * 1000) / 10, new: [...cur].filter((c) => !seen.has(c)).length });
    }
    for (const c of cur) seen.add(c);
  }

  const dsr = counter([...ds.values()].map((r) => s(r.DS_Rating) || "Unrated"));
  const capc = counter([...ds.values()].map((r) => s(r.Wealth_Based_Capacity) || "Unrated"));
  const capOf = (c: number) => s(ds.get(c)?.Wealth_Based_Capacity);
  const person = (c: number) => {
    const p = pd.get(c); const d = ds.get(c);
    return { cptid: c, name: name.get(c) ?? "", lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "",
      largest: round2(p?.max ?? 0), years: p?.fys.size ?? 0, ds: s(d?.DS_Rating), capacity: capOf(c), capMin: capmin(capOf(c)), qs: s(d?.Quality_Score) };
  };
  const Y3 = yearsAgo(3);
  const pdE = [...pd.entries()];
  const hw = [...ds.keys()].filter((c) => capmin(ds.get(c)!.Wealth_Based_Capacity) >= 25000).map(person).sort((a, b) => b.capMin - a.capMin || b.lifetime - a.lifetime);
  const mid = pdE.filter(([, p]) => p.total >= 250 && p.total < 5000 && p.last && p.last >= Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const leg = pdE.filter(([, p]) => p.fys.size >= 3 && p.total < 25000).map(([c]) => person(c)).sort((a, b) => b.years - a.years || b.lifetime - a.lifetime);
  const lapsed = pdE.filter(([, p]) => p.total >= 1000 && p.last && p.last < Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const top = [...pdE].sort((a, b) => b[1].total - a[1].total).slice(0, 250).map(([c]) => person(c));

  // Campaign committee: giving (9/10/26 sheet). Shown on the "Committee" tab (board slot).
  const findC = (nm: string) => { const t = nm.toLowerCase(); for (const [c, n] of name) if (n.toLowerCase().includes(t)) return c; return undefined; };
  const board = cgRows.filter((r) => !/NOT COUNTING/i.test(s(r.Notes))).map((r) => {
    const nm = s(r.Name); const c = findC(nm); const p = c === undefined ? undefined : pd.get(c);
    const pledge = money(r.Pledge_Amount), don = money(r.Donation_Amount);
    return { cptid: c, name: nm, title: pledge ? `Pledge ${"$" + pledge.toLocaleString("en-US")}` : don ? "Gift received" : "No gift recorded yet",
      board: "Campaign Committee", term: pdate(r.Donation_Date) ?? "", active: true, ask: pledge, get: don,
      lifetime: round2(p?.total ?? 0), last: p?.last ?? "", ds: c !== undefined ? person(c).ds : "", capacity: c !== undefined ? capOf(c) : "" };
  });
  const committee = crRows.map((r) => ({ cptid: null as number | null, name: s(r.Prospect_Name),
    title: [s(r.A_Ask) && `A: ${s(r.A_Ask)}`, s(r.B_Secondary) && `B: ${s(r.B_Secondary)}`, s(r.C_Intro) && `C: ${s(r.C_Intro)}`].filter(Boolean).join(" · ") }));

  // Contacts from MASTER.
  const contact = new Map<number, Record<string, string>>();
  const ph = (v: unknown) => { const t = s(v); return t.endsWith(".0") ? t.slice(0, -2) : t; };
  for (const [c, r] of master) {
    const ct: Record<string, string> = {};
    const kw: Record<string, unknown> = { street: [s(r.Address), s(r.Address2)].filter(Boolean).join(", "), city: r.City, state: r.State, zip: r.Zip_Code,
      phone: ph(r.Phone1), phone2: ph(r.Phone2), phone3: ph(r.Phone3), email: s(r.Email1) || s(r.Email2), email2: s(r.Email1) ? r.Email2 : r.Email3, title: r.Title };
    for (const [k, v] of Object.entries(kw)) { const t = s(v); if (t) ct[k] = t; }
    contact.set(c, ct);
  }

  // Campaign gifts + committee pledges (the "Campaign Gifts" tab; reuses the givebutter slot).
  const transactions = camp.map((g) => ({ cptid: g.c, name: (g.c !== null && name.get(g.c)) || g.name, date: g.d ?? "", amount: round2(g.a),
    campaign: "$12M Capital Campaign", fund: g.reason, status: "Received", dedication: g.type })).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.amount - a.amount));
  const pledges = cgRows.filter((r) => money(r.Pledge_Amount) > 0).map((r) => {
    const amt = money(r.Pledge_Amount);
    return { cptid: findC(s(r.Name)) ?? null, name: s(r.Name), pledged: pdate(r.Donation_Date) ?? "", amount: amt, fulfilled: 0, remaining: amt,
      campaign: "$12M Capital Campaign", status: /verbal/i.test(s(r.Notes)) ? "Verbal" : "Pledged", frequency: "", expected: "" };
  }).sort((a, b) => b.amount - a.amount);
  const gbDates = transactions.map((t) => t.date).filter(Boolean).sort();
  const givebutter = {
    from: gbDates[0] ?? "", to: gbDates[gbDates.length - 1] ?? "", transactions, pledges,
    txCount: transactions.length, txTotal: round2(campTot), txDonors: new Set(camp.map((g) => g.c ?? g.name)).size,
    matched: transactions.filter((t) => t.cptid !== null).length,
    pledgeCount: pledges.length, pledgeTotal: round2(pledges.reduce((a, p) => a + p.amount, 0)),
    byCampaign: mostCommon(counter(transactions.map((t) => t.dedication || "Other"))).map(([k, n]) => ({ campaign: k, gifts: n, total: round2(transactions.filter((t) => (t.dedication || "Other") === k).reduce((a, t) => a + t.amount, 0)) })),
  };

  // Curated committee seating -> GC2P pool. Seat = level from the committee's chart work.
  let synth = SYNTH_BASE;
  const pool = gpRows.map((r) => {
    const c = cid(r.cptid) ?? ++synth; const lvl = money(r.level); const real = c < SYNTH_BASE;
    const base = real ? person(c) : { cptid: c, name: "", lifetime: 0, gifts: 0, first: "", last: "", largest: 0, years: 0, ds: "", capacity: "", capMin: 0, qs: "" };
    return { ...base, name: s(r.name) || base.name, rating: lvl, basis: "Committee seating", ask: lvl, solicitor: s(r.solicitor) || "Unassigned",
      donorType: s(r.type), status: s(r.status), capText: s(r.capacity), wealth: s(r.rating), history: s(r.history), note: s(r.note), committedAmt: money(r.committed) };
  });
  const portfolio = pool.map((p) => ({ cptid: p.cptid, name: p.name, solicitor: p.solicitor, ask: p.ask, type: p.donorType, donorType: p.donorType,
    priority: p.status, task: p.note, lifetime: p.lifetime, prevAsk: 0, capacity: p.capText, ds: p.wealth }));
  const committed = pool.filter((p) => COMMITTED.has(p.status)).map((p) => ({ cptid: p.cptid, name: p.name, solicitor: p.solicitor, ask: p.committedAmt,
    type: p.donorType, donorType: p.donorType, priority: p.status, task: p.history, lifetime: p.lifetime, prevAsk: 0, capacity: p.capText, ds: p.wealth }));
  const unrated = unRows.map((r) => ({ name: s(r.name), type: s(r.type), note: s(r.note) }));
  const notSeated = nsRows.map((r) => ({ name: s(r.name), reason: s(r.reason) }));

  const allc = new Set<number>([...master.keys(), ...ds.keys(), ...pd.keys()]);
  const has = (c: number, k: string) => Boolean(contact.get(c)?.[k]);
  const all = [...allc];
  const health = {
    records: allc.size, address: all.filter((c) => has(c, "street")).length, phone: all.filter((c) => has(c, "phone")).length,
    email: all.filter((c) => has(c, "email")).length, orgs: mRows.filter((r) => s(r.Record_Type) && s(r.Record_Type) !== "Individual").length,
    duplicates: mRows.filter((r) => s(r.DELETE)).length, dsScreened: ds.size, constituents: allc.size, multiCptAccounts: 0,
  };
  const dtype = counter([...master.values()].map((r) => s(r.Donor_Type) || "Not coded"));
  const flags = { "Campaign committee members": board.length, "Prospects with committee ratings": crRows.length, "Seated on the $12M gift chart": pool.length,
    "Nevada Cares Campus donors": new Set(gifts.filter((g) => g.src === "cares").map((g) => g.c)).size, "$12M campaign donors": givebutter.txDonors };
  const otype = counter(mRows.map((r) => s(r.Record_Type) || "Not coded"));
  const stagesM = new Map<string, [number, number]>();
  for (const g of gifts) { const k = g.src === "campaign" ? "$12M Capital Campaign" : "Nevada Cares Campus"; const x = stagesM.get(k) ?? [0, 0]; x[0] += 1; x[1] += g.a; stagesM.set(k, x); }

  const solicitors = [...new Set(pool.map((p) => p.solicitor))].sort();
  const batches = solicitors.map((sol) => {
    const ps = pool.filter((p) => p.solicitor === sol);
    return { batch: sol, count: ps.length, tiers: Object.fromEntries(counter(ps.map((p) => p.status || "No status"))),
      people: ps.map((p) => ({ cptid: p.cptid, name: p.name, tier: p.status, interviewer: sol, lifetime: p.lifetime, ds: p.wealth, ask: p.ask })) };
  });

  const snapshot = {
    pool, unrated, notSeated, client: "Washoe Children\u2019s Behavioral Health Center", asOf, builtAt: builtAt(), source: "",
    kpi: { total: round2(tot), gifts: gifts.length, donors: pd.size, avg: round2(tot / Math.max(1, gifts.length)), gho: round2(tot), cash: round2(campTot), inkind: 0,
      campaign: round2(campTot), campaignGifts: camp.length, campaignDonors: givebutter.txDonors },
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
  for (const [c, r] of master) { const x = rec(c); x.kind = s(r.Record_Type); if (s(r.Notes)) x.notes.push(s(r.Notes)); }
  for (const [c, ct] of contact) rec(c).contact = ct;
  for (const [c, d] of ds) { const x = rec(c); x.ds = Object.fromEntries(DS_KEYS.map(([k, col]) => [k, dsField(col, d[col])])); x.kind ||= "Individual"; }
  for (const g of [...gifts].sort((a, b) => ((a.d ?? "") < (b.d ?? "") ? 1 : -1))) {
    if (g.c === null) continue;
    rec(g.c).gifts.push({ date: g.d ?? "", amount: round2(g.a), stage: g.src === "campaign" ? "$12M Capital Campaign" : "Nevada Cares Campus", type: g.type, campaign: g.reason });
  }
  for (const [c, p] of pd) {
    const m = new Map<number, number>();
    for (const g of gifts) if (g.c === c && g.d) m.set(yr(g.d)!, (m.get(yr(g.d)!) ?? 0) + g.a);
    rec(c).years = [...m].sort((a, b) => b[0] - a[0]).map(([year, amount]) => ({ year, amount: round2(amount) }));
    void p;
  }
  for (const b of board) if (b.cptid !== undefined) rec(b.cptid).committees.push("Campaign committee");
  for (const p of pool) {
    if (p.cptid >= SYNTH_BASE || !R.has(p.cptid)) continue;
    const x = rec(p.cptid);
    x.portfolio = { solicitor: p.solicitor, secondary: "", ask: p.ask, prevAsk: 0, priority: p.status, task: p.note, due: "", relationship: p.history, naming: "", donorType: p.donorType };
    x.calling.push({ batch: "$12M gift chart", tier: p.status, interviewer: p.solicitor, appt: "" });
  }
  const lists: [string, Set<number | null | undefined>][] = [["Campaign committee", new Set(board.map((b) => b.cptid))], ["$12M gift chart", new Set(pool.map((p) => p.cptid))]];
  const index: Record<string, unknown>[] = [];
  for (const [c, x] of R) {
    x.flags = lists.filter(([, ss]) => ss.has(c)).map(([k]) => k);
    const p = pd.get(c); const d = x.ds; const cap = d["Wealth-Based Capacity"] || "";
    const sm = { lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "", largest: round2(p?.max ?? 0),
      years: p?.fys.size ?? 0, band: p ? band(p.total) : "No gifts", ghoTotal: p ? round2(p.total) : null };
    x.summary = sm;
    if (!x.name) x.name = `CPTID ${c}`;
    index.push({ cptid: c, name: x.name, kind: x.kind, city: x.contact.city ?? "", lifetime: sm.lifetime, gifts: sm.gifts, largest: sm.largest,
      last: sm.last, years: sm.years, band: sm.band, ds: d["DS Rating"] || "", capacity: cap || (Object.keys(d).length ? "Unrated" : ""), capMin: capmin(cap) });
  }
  index.sort((a, b) => (b.lifetime as number) - (a.lifetime as number));
  const records = { asOf, index, records: Object.fromEntries([...R].map(([k, v]) => [String(k), v])) };
  return { snapshot, records, pirs: await pirLinks("wcbhc") };
}
