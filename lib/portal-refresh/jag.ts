import {
  band, builtAt, dsField, capmin, cid, counter, Gift, givingAggregates, loadedAsOf, money, mostCommon, pdate, perDonor,
  pirLinks, pyramid, retention, round2, Row, rows, s, sortedItems, yearsAgo,
} from "./common";

// Port of build_snap_jag.py + build_records_jag.py. Reads the jag.raw_* tables
// (1:1 copies of the JAG_Nevada.accdb tables) because the standardized jag.*
// tables drop fields the portal shows (names, company/title, invitee notes).

const DS_KEYS: [string, string][] = [
  ["DS Rating", "DS_Rating"], ["Wealth-Based Capacity", "Wealth_Based_Capacity"], ["Quality Score", "Quality_Score"],
  ["RFM Total", "RFM_Total"], ["Real Estate Est", "Real_Estate_Est"], ["# Of Prop", "Of_Prop"],
  ["SEC Stock Value", "SEC_Stock_Value"], ["Date Searched", "Date_Searched"],
];

export async function buildJag() {
  const q = (t: string) => rows(`SELECT * FROM jag.[${t}] ORDER BY row_id`);
  const [ghoRows, dsRows, feasRows, mgh, boardRows, anedot, ii, inv107, invOct, swgas, wish, asOf] = await Promise.all([
    q("raw_giving_history_overview"), q("raw_donorsearch_results"), q("raw_feasibility_results"), q("raw_master_giving_history"),
    q("raw_board_info"), q("raw_anedot_donor_info_from_client"), q("raw_i_i_invite_list"), q("raw_invitee_list_updates_10_7_2026"),
    q("raw_invitee_list_october_2026"), q("raw_sw_gas_donors"), q("raw_jaq_wish_list_for_feasibility"), loadedAsOf("jag"),
  ]);
  const byC = (rr: Row[]) => { const m = new Map<number, Row>(); for (const r of rr) { const c = cid(r.CPTID); if (c !== null) m.set(c, r); } return m; };
  const gho = byC(ghoRows), ds = byC(dsRows), feas = byC(feasRows);
  const fullName = (r: Row) => [s(r.First_Name), s(r.Last_Name)].filter(Boolean).join(" ");
  const name = new Map<number, string>([...gho].map(([c, r]) => [c, s(r.Account_Name)]));
  for (const [c, r] of ds) if (!name.has(c)) name.set(c, fullName(r));
  for (const [c, r] of feas) if (!name.get(c)) name.set(c, fullName(r));

  const gifts: Gift[] = mgh.map((r) => {
    const c = cid(r.CPTID);
    if (c !== null && !name.get(c) && s(r.Account_Name)) name.set(c, s(r.Account_Name));
    return { c, a: money(r.Gift_Amount), d: pdate(r.Gift_Date), s: s(r.Gift_Source_Description) || "Not coded", t: s(r.Record_Type), camp: s(r.Campaign_Appeal) };
  });
  const tot = gifts.reduce((a, g) => a + g.a, 0);
  const { bystage, fys } = givingAggregates(gifts);
  const pd = perDonor(gifts);
  const dsr = counter([...ds.values()].map((r) => s(r.DS_Rating) || "Unrated"));
  const capc = counter([...ds.values()].map((r) => s(r.Wealth_Based_Capacity) || "Unrated"));
  const person = (c: number) => {
    const p = pd.get(c); const d = ds.get(c);
    return { cptid: c, name: name.get(c) ?? "", lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "",
      largest: round2(p?.max ?? 0), years: p?.fys.size ?? 0, ds: s(d?.DS_Rating), capacity: s(d?.Wealth_Based_Capacity),
      capMin: capmin(d?.Wealth_Based_Capacity), qs: s(d?.Quality_Score) };
  };
  const Y3 = yearsAgo(3);
  const pdE = [...pd.entries()];
  const hw = [...ds.keys()].filter((c) => capmin(ds.get(c)!.Wealth_Based_Capacity) >= 25000).map(person).sort((a, b) => b.capMin - a.capMin || b.lifetime - a.lifetime);
  const mid = pdE.filter(([, p]) => p.total >= 250 && p.total < 5000 && p.last && p.last >= Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const leg = pdE.filter(([, p]) => p.fys.size >= 4 && p.total < 25000).map(([c]) => person(c)).sort((a, b) => b.years - a.years || b.lifetime - a.lifetime);
  const lapsed = pdE.filter(([, p]) => p.total >= 1000 && p.last && p.last < Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const top = [...pdE].sort((a, b) => b[1].total - a[1].total).slice(0, 250).map(([c]) => person(c));

  const board = boardRows.map((r) => {
    const c = cid(r.CPTID); const p = c === null ? undefined : pd.get(c); const d = c === null ? undefined : ds.get(c);
    return { cptid: c, name: s(r.Account_Name) || (c !== null ? name.get(c) ?? "" : ""), title: s(r.Board_Title) || s(r.Board_Status), board: "JAG Nevada Board",
      term: [s(r.Board_Start).slice(0, 10), s(r.Board_End).slice(0, 10)].filter(Boolean).join(" - "), active: !r.No_Longer_on_Board,
      ask: money(r.Ask_Amount), get: 0, lifetime: round2(p?.total ?? 0), last: p?.last ?? "", ds: s(d?.DS_Rating), capacity: s(d?.Wealth_Based_Capacity) };
  });

  // Contacts merged from the lists that carry them (Access Master is unreadable).
  const contact = new Map<number, Record<string, string>>();
  const addc = (c: number | null, kw: Record<string, unknown>) => {
    if (c === null) return;
    const ct = contact.get(c) ?? {}; contact.set(c, ct);
    for (const [k, v] of Object.entries(kw)) { const t = s(v); if (t && !ct[k]) ct[k] = t; }
  };
  const phone = (v: unknown) => { const t = s(v); return t.endsWith(".0") ? t.slice(0, -2) : t; };
  for (const r of anedot) addc(cid(r.CPTID), { street: r.Address_Line_1, city: r.City, state: r.State, zip: phone(r.Zip), phone: phone(r.Phone), email: r.Email });
  for (const r of ii) addc(cid(r.CPTID), { street: r.Primary_Street, city: r.Primary_City, state: r.Primary_State, zip: r.Primary_ZIP_Code, phone: r.Primary_Phone_Number, email: r.Primary_Email_Address, affiliation: r.Employer });
  for (const rr of [inv107, invOct]) for (const r of rr) {
    const e = [s(r.Email1), s(r.Email2), s(r.Phone2)].filter((x) => x.includes("@"));
    const ph = [s(r.Phone1), s(r.Phone2), s(r.Email2)].filter((x) => x && !x.includes("@"));
    addc(cid(r.CPTID), { email: e[0] ?? "", phone: ph[0] ?? "", affiliation: r.Organization });
  }
  for (const r of swgas) addc(cid(r.CPTID), { street: r.Primary_Street, city: r.Primary_City, state: r.Primary_State, zip: r.Primary_ZIP_Code, email: r.Primary_Email_Address });
  for (const [c, r] of feas) addc(c, { affiliation: r.Company, title: r.Title });

  const allc = new Set<number>([...gho.keys(), ...ds.keys(), ...feas.keys(), ...pd.keys()]);
  const has = (c: number, k: string) => Boolean(contact.get(c)?.[k]);
  const all = [...allc];
  const orgTypes = new Set(["Corporation", "Foundation", "Organization", "Government"]);
  const health = {
    records: allc.size, address: all.filter((c) => has(c, "street")).length, phone: all.filter((c) => has(c, "phone")).length,
    email: all.filter((c) => has(c, "email")).length,
    orgs: new Set(gifts.filter((g) => orgTypes.has(g.t)).map((g) => `${g.c}|${g.t}`)).size,
    duplicates: 0, dsScreened: ds.size, constituents: allc.size, multiCptAccounts: 0,
  };
  const dtype = counter([...gho.values()].map((r) => s(r.Donor_Type) || "Not coded"));
  const flags = { "Board (current or former)": boardRows.length, "Feasibility study prospect": feas.size, "Feasibility wish list": wish.length,
    "I&I invite list": ii.length, "October 2026 invitee list": inv107.length, "SW Gas donors": swgas.length };
  const pairs = new Set<string>(); const otList: string[] = [];
  for (const g of gifts) { const t = g.t || "Not coded"; const k = `${g.c}|${t}`; if (!pairs.has(k)) { pairs.add(k); otList.push(t); } }
  const otype = counter(otList);

  const RES: Record<string, string> = { G3: "Not reached", GCOM: "Not reached", DNC: "Do not call", WorkingOn: "In progress" };
  const fp = [...feas].map(([c, r]) => {
    const lr = s(r.Last_Result_Code);
    const result = r.Interview_Completed ? "Completed" : r.Declined_to_be_Interview ? "Declined" : RES[lr] ?? (lr || "Open");
    return { cptid: c, name: name.get(c) ?? "", tier: s(r.Tier), company: s(r.Company), result, date: s(r.Interview_Date).slice(0, 10),
      consider: Boolean(r.Donor_Consideration), multiYear: Boolean(r.Muliti_Year_Donation), leadership: Boolean(r.Campaign_Leadership), introduce: Boolean(r.Introduce_Someone_to_JAG) };
  }).sort((a, b) => (a.tier < b.tier ? -1 : a.tier > b.tier ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const tiers = [...new Set(fp.map((x) => x.tier))].sort();
  const cnt = (f: (x: (typeof fp)[number]) => boolean) => fp.filter(f).length;
  const feasibility = {
    total: fp.length, completed: cnt((x) => x.result === "Completed"), declined: cnt((x) => x.result === "Declined"), consider: cnt((x) => x.consider),
    multiYear: cnt((x) => x.multiYear), leadership: cnt((x) => x.leadership), introduce: cnt((x) => x.introduce),
    byTier: tiers.map((t) => ({ tier: t, prospects: cnt((x) => x.tier === t), completed: cnt((x) => x.tier === t && x.result === "Completed"), consider: cnt((x) => x.tier === t && x.consider) })),
    people: fp,
  };
  const batches = [{ batch: "Feasibility study prospects", count: fp.length, tiers: Object.fromEntries(counter(fp.map((x) => x.tier || "No tier"))),
    people: fp.map((x) => ({ cptid: x.cptid, name: x.name, tier: x.tier, interviewer: "", lifetime: round2(pd.get(x.cptid)?.total ?? 0), ds: s(ds.get(x.cptid)?.DS_Rating) })) }];
  const pool: (ReturnType<typeof person> & { rating: number; basis: string })[] = [];
  for (const c of new Set([...ds.keys(), ...pd.keys()])) {
    const p = person(c); const rating = p.capMin || p.largest;
    if (rating >= 50000) pool.push({ ...p, rating, basis: p.capMin ? "Capacity (DonorSearch min)" : "Largest gift" });
  }
  pool.sort((a, b) => b.rating - a.rating || b.lifetime - a.lifetime);

  const snapshot = {
    pool, client: "JAG Nevada (Jobs for Nevada's Graduates)", asOf, builtAt: builtAt(), source: "",
    kpi: { total: round2(tot), gifts: gifts.length, donors: pd.size, avg: round2(tot / Math.max(1, gifts.length)),
      gho: round2([...gho.values()].reduce((a, r) => a + money(r.Total_Amt_Gifts), 0)), cash: round2(tot), inkind: 0 },
    stages: [...bystage].map(([k, v]) => ({ stage: k, gifts: v[0], total: round2(v[1]) })).sort((a, b) => b.total - a.total), fys, retention: retention(gifts),
    pyramid: pyramid(pd), dsRating: sortedItems(dsr), capacity: [...capc.entries()].sort((a, b) => capmin(b[0]) - capmin(a[0])),
    highWealth: hw.slice(0, 300), highWealthCount: hw.length, midLevel: mid.slice(0, 300), midLevelCount: mid.length,
    legacy: leg.slice(0, 300), legacyCount: leg.length, lapsed: lapsed.slice(0, 300), lapsedCount: lapsed.length, top,
    board, health, donorType: mostCommon(dtype), flags, orgTypes: mostCommon(otype), batches, feasibility,
  };

  // ---------------- records ----------------
  type Rec = { cptid: number; name: string; kind: string; contact: Record<string, string>; flags: string[]; ds: Record<string, string>;
    gifts: Record<string, unknown>[]; board: Record<string, unknown>[]; committees: string[]; calling: Record<string, unknown>[];
    calls: Record<string, unknown>[]; notes: string[]; summary: Record<string, unknown>; feasibility?: Record<string, unknown> };
  const R = new Map<number, Rec>();
  const rec = (c: number): Rec => {
    let x = R.get(c);
    if (!x) R.set(c, (x = { cptid: c, name: name.get(c) ?? "", kind: "", contact: {}, flags: [], ds: {}, gifts: [], board: [], committees: [], calling: [], calls: [], notes: [], summary: {} }));
    return x;
  };
  for (const c of allc) rec(c);
  for (const [c, ct] of contact) if (R.has(c)) R.get(c)!.contact = ct;
  for (const [c, d] of ds) { const x = rec(c); x.ds = Object.fromEntries(DS_KEYS.map(([k, col]) => [k, dsField(col, d[col])])); x.kind = "Individual"; }
  for (const g of gifts) {
    if (g.c === null) continue;
    const x = rec(g.c); x.gifts.push({ date: g.d ?? "", amount: round2(g.a), stage: g.s, type: g.t, campaign: g.camp });
    if (g.t && !x.kind) x.kind = g.t;
  }
  for (const b of board) if (b.cptid !== null) rec(b.cptid).board.push({ board: b.board, title: b.title, term: b.term, active: b.active, ask: b.ask, get: 0 });
  const setOf = (rr: Row[]) => new Set(rr.map((r) => cid(r.CPTID)));
  const lists: [string, Set<number | null>][] = [["Feasibility wish list", setOf(wish)], ["I&I invite list", setOf(ii)], ["October 2026 invitee list", setOf(inv107)]];
  for (const [c, x] of R) x.flags = lists.filter(([, ss]) => ss.has(c)).map(([k]) => k);
  for (const r of inv107) {
    const c = cid(r.CPTID);
    if (c !== null && R.has(c)) for (const k of ["Notes", "JAG_Notes"]) if (s(r[k])) R.get(c)!.notes.push(s(r[k]));
  }
  for (const x of fp) {
    const f = feas.get(x.cptid)!; const r = rec(x.cptid);
    r.calling.push({ batch: "Feasibility study", tier: x.tier, interviewer: "", appt: x.date });
    r.feasibility = { tier: x.tier, date: x.date, completed: x.result === "Completed", declined: x.result === "Declined", consider: x.consider,
      multiYear: x.multiYear, leadership: x.leadership, introduce: x.introduce, result: x.result, company: x.company, title: s(f.Title) };
  }
  const index: Record<string, unknown>[] = [];
  for (const [c, x] of R) {
    x.gifts.sort((a, b) => (String(b.date) < String(a.date) ? -1 : String(b.date) > String(a.date) ? 1 : 0));
    const p = pd.get(c); const d = x.ds; const cap = d["Wealth-Based Capacity"] ?? "";
    const sm = { lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "", largest: round2(p?.max ?? 0),
      years: p?.fys.size ?? 0, band: p ? band(p.total) : "No gifts", ghoTotal: gho.has(c) ? money(gho.get(c)!.Total_Amt_Gifts) : null };
    x.summary = sm;
    if (!x.name) x.name = `CPTID ${c}`;
    index.push({ cptid: c, name: x.name, kind: x.kind, city: x.contact.city ?? "", lifetime: sm.lifetime, gifts: sm.gifts, largest: sm.largest,
      last: sm.last, years: sm.years, band: sm.band, ds: d["DS Rating"] ?? "", capacity: cap || (Object.keys(d).length ? "Unrated" : ""), capMin: capmin(cap) });
  }
  index.sort((a, b) => (b.lifetime as number) - (a.lifetime as number));
  const records = { asOf, index, records: Object.fromEntries([...R].map(([k, v]) => [String(k), v])) };
  return { snapshot, records, pirs: await pirLinks("jag") };
}
