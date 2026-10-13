import {
  band, builtAt, dsField, capmin, cid, counter, Gift, givingAggregates, loadedAsOf, money, mostCommon, pdate, perDonor,
  pirLinks, pyramid, retention, round2, Row, rows, s, sortedItems, yearsAgo,
} from "./common";

// Port of build_snap.py + build_records.py (CSNF). Reads schema csnf in Azure SQL
// and produces the same JSON shapes as csnf-data/snapshot.json and records.json.

const BATCHES: [string, string, string][] = [
  ["CSFN_to_VS_09_22_2026", "Sep 22", "Sep 22, 2026"],
  ["CSNF_to_VS_09_29_2026", "Sep 29", "Sep 29, 2026"],
  ["CSFN_to_VS_10_06_2026", "Oct 6", "Oct 6, 2026"],
];
const DS_KEYS: [string, string][] = [
  ["DS Rating", "DS_Rating"], ["Wealth-Based Capacity", "Wealth_Based_Capacity"], ["Quality Score", "Quality_Score"],
  ["RFM Total", "RFM_Total"], ["Real Estate Est", "Real_Estate_Est"], ["# Of Prop", "Of_Prop"],
  ["SEC Stock Value", "SEC_Stock_Value"], ["Date Searched", "Date_Searched"],
];
const IND_FLAGS: [string, string][] = [
  ["CSN Employee Donor", "CSN_Employee_Donor"], ["Former Employee", "Former_Employee"], ["Scholarship Donor", "Scholarship_Donor"],
  ["Student", "Student"], ["Scholarship Recipient", "Scholarship_Recipient"], ["Alumni", "Alumni"],
  ["CSN Foundation Board", "CSN_Foundation_Board"], ["Board of Trustees", "Board_of_Trustees"],
  ["Institutional Advisory Council", "Institutional_Advisory_Council"],
];
const ORG_FLAGS: [string, string][] = [
  ["Major Donor", "Major_Donor"], ["Golf Sponsor", "Golf_Sponsor"], ["Women Owned Business", "Women_Owned_Business"],
  ["Minority Owned Business", "Minority_Owned_Business"], ["Anonymous Donor", "Anonymous_Donor"],
];

export async function buildCsnf() {
  const q = (t: string, extra = "") => rows(`SELECT * FROM csnf.[${t}] ${extra} ORDER BY row_id`);
  const [clientId, ghoRows, giftRows, dsRows, boardRows, committeeRows, indRows, orgRows, dupRows, alumRows, dailyRows, noteRows, asOf] =
    await Promise.all([
      q("Client_ID"), q("Giving_History_Overview"),
      q("Raw_Data_Gift_File", "WHERE Stage IS NOT NULL AND Stage <> ''"),
      q("DonorSearch_Results"), q("Board_Members"), q("Board_Committee_Members"),
      q("Raw_Data_Individual_Donors"), q("Raw_Data_List_of_Foundation"),
      rows("SELECT COUNT(*) AS n FROM csnf.Duplciate_Records"), q("Alumni_List"), q("Daily_Results"),
      q("Interview_Prospects_Notes"), loadedAsOf("csnf"),
    ]);
  const batchRows = await Promise.all(BATCHES.map(([t]) => q(t)));

  // account -> lowest CPTID
  const acc = new Map<string, number>();
  for (const r of clientId) {
    const a = s(r.Account_ID); const c = cid(r.CPTID);
    if (!a || c === null) continue;
    if (!acc.has(a) || c < acc.get(a)!) acc.set(a, c);
  }
  const gho = new Map<number, Row>();
  for (const r of ghoRows) { const c = cid(r.CPTID); if (c !== null) gho.set(c, r); }
  const name = new Map<number, string>([...gho].map(([c, r]) => [c, s(r.Account_Name)]));

  const gifts: Gift[] = giftRows.map((r) => ({
    c: acc.get(s(r.Account_ID)) ?? null, a: money(r.Amount), d: pdate(r.Close_Date), s: s(r.Stage),
    t: s(r.Opportunity_Record_Type), camp: s(r.Primary_Campaign_Source), alloc: s(r.Allocations), tribute: s(r.Tribute_Type),
  }));
  const tot = gifts.reduce((a, g) => a + g.a, 0);
  const { bystage, fys } = givingAggregates(gifts, 2010);
  const pd = perDonor(gifts);

  const ds = new Map<number, Row>();
  for (const r of dsRows) { const c = cid(r.CPTID); if (c !== null) ds.set(c, r); }
  const dsr = counter([...ds.values()].map((r) => s(r.DS_Rating)));
  const capc = counter([...ds.values()].map((r) => s(r.Wealth_Based_Capacity) || "Unrated"));

  const person = (c: number) => {
    const p = pd.get(c); const d = ds.get(c);
    return {
      cptid: c, name: name.get(c) || s(d?.Account_Name), lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0,
      first: p?.first ?? "", last: p?.last ?? "", largest: round2(p?.max ?? 0), years: p?.fys.size ?? 0,
      ds: s(d?.DS_Rating), capacity: s(d?.Wealth_Based_Capacity), capMin: capmin(d?.Wealth_Based_Capacity), qs: s(d?.Quality_Score),
    };
  };
  const Y3 = yearsAgo(3);
  const hw = [...ds.keys()].filter((c) => capmin(ds.get(c)!.Wealth_Based_Capacity) >= 25000).map(person)
    .sort((a, b) => b.capMin - a.capMin || b.lifetime - a.lifetime);
  const pdE = [...pd.entries()];
  const mid = pdE.filter(([, p]) => p.total >= 250 && p.total < 5000 && p.last && p.last >= Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const leg = pdE.filter(([, p]) => p.fys.size >= 10 && p.total < 25000).map(([c]) => person(c)).sort((a, b) => b.years - a.years || b.lifetime - a.lifetime);
  const lapsed = pdE.filter(([, p]) => p.total >= 1000 && p.last && p.last < Y3).map(([c]) => person(c)).sort((a, b) => b.lifetime - a.lifetime);
  const top = [...pdE].sort((a, b) => b[1].total - a[1].total).slice(0, 250).map(([c]) => person(c));

  const board = boardRows.map((r) => {
    const c = cid(r.CPTID); const p = c === null ? undefined : pd.get(c); const d = c === null ? undefined : ds.get(c);
    return {
      cptid: c, name: s(r.Account_Name), title: s(r.Title), board: s(r.Board), term: s(r.Term), active: !r.No_longer_on_Board,
      ask: money(r.Ask_Amount), get: money(r.Get_Amount), lifetime: round2(p?.total ?? 0), last: p?.last ?? "",
      ds: s(d?.DS_Rating), capacity: s(d?.Wealth_Based_Capacity),
    };
  });

  const has = (v: unknown) => Boolean(s(v));
  const accCount = counter(clientId.map((r) => s(r.Account_ID)));
  const health = {
    records: indRows.length, address: indRows.filter((r) => has(r.Mailing_Street)).length,
    phone: indRows.filter((r) => has(r.Phone) || has(r.Mobile)).length,
    email: indRows.filter((r) => has(r.Email) || has(r.Work_Email)).length,
    orgs: orgRows.length, duplicates: Number(dupRows[0]?.n ?? 0), dsScreened: ds.size, constituents: gho.size,
    multiCptAccounts: [...accCount.values()].filter((v) => v > 1).length,
  };
  const dtype = counter(indRows.map((r) => s(r.Donor_Type) || "Not coded"));
  const flags = Object.fromEntries(
    IND_FLAGS.filter(([k]) => k !== "Student").map(([k, col]) => [k, indRows.filter((r) => r[col]).length])
  );
  const otype = counter(orgRows.map((r) => s(r.Type) || "Not coded"));

  // Calling batches. The Sep 22 table is shifted one column: tier sits in Client_ID, interviewer in Feasibility_Study_Tier.
  // The whole table is shifted, so rows without a tier still carry the interviewer in Feasibility_Study_Tier.
  for (const rr of batchRows)
    if (rr.some((r) => s(r.Client_ID).startsWith("Tier")))
      for (const r of rr) { r.Interviewer_Assigned = r.Feasibility_Study_Tier; r.Feasibility_Study_Tier = r.Client_ID; }
  const batches = BATCHES.map(([, lab], i) => {
    const rr = batchRows[i];
    return {
      batch: lab, count: rr.length,
      tiers: Object.fromEntries(counter(rr.map((r) => s(r.Feasibility_Study_Tier) || "No tier"))),
      people: rr.map((r) => {
        const c = cid(r.CPTID);
        return { cptid: c, name: s(r.Account_Name), tier: s(r.Feasibility_Study_Tier), interviewer: s(r.Interviewer_Assigned),
          lifetime: round2((c !== null && pd.get(c)?.total) || 0), ds: s(c !== null ? ds.get(c)?.DS_Rating : "") };
      }),
    };
  });

  const al = alumRows;
  const gy = (r: Row) => (r.Graduation_Year == null ? null : Number(r.Graduation_Year));
  const alumni = {
    total: al.length,
    snv: al.filter((r) => ["889", "890", "891"].includes(s(r.Zipcode).slice(0, 3))).length,
    over30: al.filter((r) => { const y = gy(r); return Boolean(y) && y! <= 1996; }).length,
    donors: al.filter((r) => r.CPTID).length,
    bySchool: mostCommon(counter(al.map((r) => s(r.Last_Degree_School) || "Unknown")), 12),
    byDecade: [...counter(al.filter((r) => gy(r)).map((r) => String(Math.floor(gy(r)! / 10) * 10))).entries()]
      .map(([k, v]) => [Number(k), v] as [number, number]).sort((a, b) => a[0] - b[0]),
    topZips: mostCommon(counter(al.filter((r) => r.Zipcode).map((r) => s(r.Zipcode))), 15),
  };

  const pool: (ReturnType<typeof person> & { rating: number; basis: string })[] = [];
  for (const c of new Set([...ds.keys(), ...pd.keys()])) {
    const p = person(c);
    const rating = p.capMin || p.largest;
    if (rating >= 50000) pool.push({ ...p, rating, basis: p.capMin ? "Capacity (DonorSearch min)" : "Largest gift" });
  }
  pool.sort((a, b) => b.rating - a.rating || b.lifetime - a.lifetime);

  const snapshot = {
    pool, client: "College of Southern Nevada Foundation", asOf, builtAt: builtAt(), source: "Azure SQL (csnf)",
    kpi: {
      total: round2(tot), gifts: gifts.length, donors: pd.size, avg: round2(tot / Math.max(1, gifts.length)),
      gho: round2([...gho.values()].reduce((a, r) => a + money(r.Gift_Total), 0)),
      cash: round2(bystage.get("Funds Raised - Posted")?.[1] ?? 0), inkind: round2(bystage.get("In-Kind Received")?.[1] ?? 0),
    },
    stages: [...bystage].map(([k, v]) => ({ stage: k, gifts: v[0], total: round2(v[1]) })), fys, retention: retention(gifts, 2012),
    pyramid: pyramid(pd), dsRating: sortedItems(dsr), capacity: [...capc.entries()].sort((a, b) => capmin(b[0]) - capmin(a[0])),
    highWealth: hw.slice(0, 300), highWealthCount: hw.length, midLevel: mid.slice(0, 300), midLevelCount: mid.length,
    legacy: leg.slice(0, 300), legacyCount: leg.length, lapsed: lapsed.slice(0, 300), lapsedCount: lapsed.length, top,
    board, health, donorType: mostCommon(dtype), flags, orgTypes: mostCommon(otype), batches, alumni,
  };

  // ---------------- records ----------------
  type Rec = {
    cptid: number; name: string; kind: string; contact: Record<string, string>; flags: string[]; ds: Record<string, string>;
    gifts: Record<string, unknown>[]; board: Record<string, unknown>[]; committees: string[]; calling: Record<string, unknown>[];
    calls: Record<string, unknown>[]; notes: string[]; alumni: Record<string, string> | null; summary: Record<string, unknown>;
    softCredits?: Record<string, string>;
  };
  const R = new Map<number, Rec>();
  const rec = (c: number): Rec => {
    let x = R.get(c);
    if (!x) R.set(c, (x = { cptid: c, name: name.get(c) ?? "", kind: "", contact: {}, flags: [], ds: {}, gifts: [], board: [], committees: [], calling: [], calls: [], notes: [], alumni: null, summary: {} }));
    return x;
  };
  for (const c of new Set([...gho.keys(), ...ds.keys(), ...pd.keys()])) rec(c);
  for (const r of indRows) {
    const c = cid(r.CPTID_added) || acc.get(s(r.Account_ID));
    if (c == null) continue;
    const x = rec(c); x.kind = "Individual";
    x.name = x.name || [s(r.First_Name), s(r.Last_Name)].filter(Boolean).join(" ");
    x.contact = { greeting: s(r.Formal_Greeting), salutation: s(r.Informal_Greeting), street: s(r.Mailing_Street), city: s(r.Mailing_City),
      state: s(r.Mailing_State_Province), zip: s(r.Mailing_Zip_Postal_Code), phone: s(r.Phone), mobile: s(r.Mobile), email: s(r.Email),
      workEmail: s(r.Work_Email), title: s(r.Title), affiliation: s(r.Primary_Affiliation), marital: s(r.Marital_Status), birthdate: s(r.Birthdate) };
    x.flags = IND_FLAGS.filter(([, col]) => r[col]).map(([k]) => k);
    x.softCredits = { count: s(r.Number_of_Soft_Credits), largest: s(r.Largest_Soft_Credit_Amount), last: s(r.Last_Soft_Credit_Amount), lastDate: s(r.Last_Soft_Credit_Date) };
  }
  for (const r of orgRows) {
    const c = cid(r.CPTID_added) || acc.get(s(r.Account_ID));
    if (c == null) continue;
    const x = rec(c); x.kind = s(r.Type) || "Organization"; x.name = x.name || s(r.Account_Name);
    x.contact = { primaryContact: s(r.Primary_Contact), email: s(r.Primary_Contact_Email), phone: s(r.Phone) || s(r.Primary_Contact_Phone),
      street: s(r.Billing_Street), city: s(r.Billing_City), state: s(r.Billing_State_Province), zip: s(r.Billing_Zip_Postal_Code) };
    x.flags = ORG_FLAGS.filter(([, col]) => r[col]).map(([k]) => k);
  }
  for (const [c, d] of ds) rec(c).ds = Object.fromEntries(DS_KEYS.map(([k, col]) => [k, dsField(col, d[col])]));
  for (const g of gifts) {
    if (g.c === null) continue;
    rec(g.c).gifts.push({ date: g.d ?? "", amount: round2(g.a), stage: g.s, type: g.t, campaign: g.camp, allocation: g.alloc, tribute: g.tribute });
  }
  for (const r of boardRows) {
    const c = cid(r.CPTID);
    if (c !== null) rec(c).board.push({ board: s(r.Board), title: s(r.Title), term: s(r.Term), active: !r.No_longer_on_Board, ask: money(r.Ask_Amount), get: money(r.Get_Amount) });
  }
  for (const r of committeeRows) { const c = cid(r.CPTID); if (c !== null) rec(c).committees.push(s(r.Committee)); }
  BATCHES.forEach(([, , lab], i) => {
    for (const r of batchRows[i]) {
      const c = cid(r.CPTID);
      if (c === null) continue;
      const x = rec(c);
      x.calling.push({ batch: lab, tier: s(r.Feasibility_Study_Tier), interviewer: s(r.Interviewer_Assigned), appt: s(r.Appt_Date) });
      if (!Object.keys(x.contact).length) x.contact = { street: s(r.Address), city: s(r.City), state: s(r.State), zip: s(r.Zip_Code), phone: s(r.Phone1), email: s(r.Email1) };
      if (!x.kind) x.kind = s(r.Record_Type);
    }
  });
  for (const r of dailyRows) {
    const c = cid(r.CPTID);
    if (c !== null) rec(c).calls.push({ date: s(r.Call_Date_Last).slice(0, 10), result: s(r.Result_Code_Last), reason: s(r.Reason_For_Declining), comments: s(r.Comments_Last) });
  }
  for (const r of noteRows) { const c = cid(r.CPTID); if (c !== null && s(r.Danita_s_Notes)) rec(c).notes.push(s(r.Danita_s_Notes)); }
  for (const r of alumRows) {
    const c = cid(r.CPTID);
    if (c !== null && R.has(c)) R.get(c)!.alumni = { school: s(r.Last_Degree_School), dept: s(r.Last_Degree_Department), degrees: s(r.All_Degrees),
      gradYear: s(r.Graduation_Year), firstGen: s(r.First_Gen_Status), veteran: s(r.Veterans_Flag) };
  }
  const index: Record<string, unknown>[] = [];
  for (const [c, x] of R) {
    x.gifts.sort((a, b) => (String(b.date) < String(a.date) ? -1 : String(b.date) > String(a.date) ? 1 : 0));
    const p = pd.get(c); const d = x.ds; const cap = d["Wealth-Based Capacity"] ?? "";
    x.summary = { lifetime: round2(p?.total ?? 0), gifts: p?.n ?? 0, first: p?.first ?? "", last: p?.last ?? "", largest: round2(p?.max ?? 0),
      years: p?.fys.size ?? 0, band: p ? band(p.total) : "No gifts", ghoTotal: gho.has(c) ? money(gho.get(c)!.Gift_Total) : null };
    if (!x.name) x.name = `CPTID ${c}`;
    const sm = x.summary as { lifetime: number; gifts: number; largest: number; last: string; years: number; band: string };
    index.push({ cptid: c, name: x.name, kind: x.kind || (Object.keys(d).length ? "Individual" : ""), city: x.contact.city ?? "",
      lifetime: sm.lifetime, gifts: sm.gifts, largest: sm.largest, last: sm.last, years: sm.years, band: sm.band,
      ds: d["DS Rating"] ?? "", capacity: cap || (Object.keys(d).length ? "Unrated" : ""), capMin: capmin(cap) });
  }
  index.sort((a, b) => (b.lifetime as number) - (a.lifetime as number));
  const records = { asOf, index, records: Object.fromEntries([...R].map(([k, v]) => [String(k), v])) };

  // Fill blank batch names from the records index (as build_snap did).
  for (const b of batches) for (const p of b.people) if (!p.name && p.cptid !== null) p.name = R.get(p.cptid)?.name ?? "";

  return { snapshot, records, pirs: await pirLinks("csnf") };
}
