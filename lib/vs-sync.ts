// ---------------------------------------------------------------------------
// Builds a study portal's dashboard payload directly from VanillaSoft.
//
// Replaces the weekly "upload the PDF into /jag-admin" step. Verified against
// the JAG Nevada project: rolling call history up per contact by latest
// terminal result reproduces the weekly Interview Status Report's Completed /
// Declined / To Be Rescheduled / In Calling Process figures.
//
// Two rules that matter and are easy to get wrong:
//   1. Count each CONTACT once by its most recent terminal result code.
//      Counting call events double-counts anyone called more than once.
//   2. Dials and emails ARE event counts (every touch), not contact counts.
// ---------------------------------------------------------------------------

import { put, get } from "@vercel/blob";
import {
  fetchCallHistory,
  fetchContacts,
  contactName,
  customField,
  type VsContact,
  type VsCallRecord,
} from "@/lib/vanillasoft";
import {
  TERMINAL_RESULT_CODES,
  isEmailResult,
  type StudyPortalConfig,
  type SurveySignalConfig,
} from "@/lib/study-portals";
import type {
  JagDashboardData,
  JagStats,
  NameDateOrg,
  NameOrg,
  DeclinedRow,
  DeceasedRow,
  FeasibilitySignal,
  MissionTheme,
} from "@/lib/jag-data";

// ---------------------------------------------------------------------------
// Accumulated contact store. The Contacts endpoint only reaches ~30 days back,
// so each sync merges the newly-modified records into a stored snapshot.
// ---------------------------------------------------------------------------

type ContactStore = Record<string, VsContact>;

async function loadContactStore(path: string): Promise<ContactStore> {
  try {
    const result = await get(path, { access: "private", useCache: false });
    if (!result?.stream) return {};
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as ContactStore) : {};
  } catch {
    return {};
  }
}

async function saveContactStore(path: string, store: ContactStore): Promise<void> {
  await put(path, JSON.stringify(store), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ---------------------------------------------------------------------------
// Survey helpers
// ---------------------------------------------------------------------------

function surveyAnswer(contact: VsContact, question: string): string {
  return customField(contact, `Survey ${question} Answer:`);
}

function surveyComment(contact: VsContact, question: string): string {
  return customField(contact, `Survey ${question} Comments:`);
}

function splitMulti(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildSignal(config: SurveySignalConfig, respondents: VsContact[]): FeasibilitySignal | null {
  const answered = respondents
    .map((c) => surveyAnswer(c, config.question))
    .filter(Boolean)
    .map((a) => a.trim());

  const denominatorPool = config.countedAnswers?.length
    ? answered.filter((a) => config.countedAnswers!.some((c) => c.toLowerCase() === a.toLowerCase()))
    : answered;

  if (denominatorPool.length === 0) return null;

  const positive = denominatorPool.filter((a) =>
    config.positiveAnswers.some((p) => a.toLowerCase() === p.toLowerCase())
  );
  const pct = Math.round((positive.length / denominatorPool.length) * 100);

  // Detail line: counts per distinct answer, in descending order.
  const counts = new Map<string, number>();
  for (const a of denominatorPool) counts.set(a, (counts.get(a) ?? 0) + 1);
  const detail =
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([answer, n]) => `${n} ${answer}`)
      .join(", ") + ` — out of ${denominatorPool.length} respondents`;

  return { stat: `${pct}%`, label: config.label, detail };
}

function buildMissionThemes(question: string, respondents: VsContact[]): MissionTheme[] {
  const counts = new Map<string, number>();
  let answered = 0;
  for (const c of respondents) {
    const values = splitMulti(surveyAnswer(c, question));
    if (values.length === 0) continue;
    answered++;
    for (const v of new Set(values)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (!answered) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, n]) => ({ label, pct: `${Math.round((n / answered) * 100)}%` }));
}

/**
 * Pull quotes are respondents' own words from the configured questions. Only
 * substantial, sentence-like comments qualify; one-word notes ("positive",
 * "No") are filtered out. Quotes still get a human read before a client sees
 * them, which is what /jag-admin's editable preview is for.
 */
function buildQuotes(questions: string[], respondents: VsContact[]): string[] {
  const quotes: string[] = [];
  for (const c of respondents) {
    for (const q of questions) {
      const text = surveyComment(c, q);
      if (text.length < 70) continue;
      if (!/[a-z]\s+[a-z]/i.test(text)) continue;
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (!quotes.includes(cleaned)) quotes.push(cleaned);
    }
  }
  return quotes;
}

// ---------------------------------------------------------------------------
// Tier + status rollups
// ---------------------------------------------------------------------------

function tierNumber(value: string): number | null {
  // Handles "Tier 1", "Tier 1A", "1", "Tier  3".
  const m = value.match(/(\d)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 5 ? n : null;
}

interface ContactOutcome {
  status: "completed" | "declined" | "rescheduled" | "closed" | "deceased" | null;
  lastDate: string;
}

function rollUpOutcomes(calls: VsCallRecord[]): Map<number, ContactOutcome> {
  const outcomes = new Map<number, ContactOutcome>();
  // calls arrive sorted oldest-first, so the last terminal code seen wins.
  for (const call of calls) {
    const status = TERMINAL_RESULT_CODES[call.result_code];
    if (!status) continue;
    outcomes.set(call.contact_id, { status, lastDate: call.call_date_time_utc });
  }
  return outcomes;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}


// ---------------------------------------------------------------------------
// Name backfill for contacts the API can no longer describe.
//
// The Contacts endpoint documents a hard 31-day `modified_after` ceiling, so a
// project that was already running when the sync went live (JAG) has callable
// history for contacts whose NAMES the API will not return again. Counts still
// come from VanillaSoft; the names for those older rows are carried over from
// the last saved dashboard so the client-facing tables keep reading correctly.
// A project synced from day one (CSNF) never hits this path.
// ---------------------------------------------------------------------------

function isPlaceholder(name: string): boolean {
  return /^Contact \d+$/.test(name);
}

function backfillNames<T extends { name: string }>(rows: T[], previous: T[] = []): T[] {
  const known = new Set(rows.filter((r) => !isPlaceholder(r.name)).map((r) => r.name));
  const spares = previous.filter((p) => !known.has(p.name));
  let i = 0;
  return rows.map((row) => {
    if (!isPlaceholder(row.name)) return row;
    const spare = spares[i++];
    return spare ? { ...row, ...spare } : row;
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface SyncResult {
  data: JagDashboardData;
  meta: {
    projectId: number;
    callRecords: number;
    contactsKnown: number;
    contactsRefreshed: number;
    tierSource: "vanillasoft" | "carried-forward";
    historyFrom: string;
    historyTo: string;
  };
}

export async function buildPortalDataFromVanillaSoft(
  portal: StudyPortalConfig,
  options: { previous?: JagDashboardData; asOf?: Date; persistContacts?: boolean } = {}
): Promise<SyncResult> {
  const asOf = options.asOf ?? new Date();
  const start = new Date(portal.historyStart);

  const [calls, refreshed, store] = await Promise.all([
    fetchCallHistory(portal.projectId, start, asOf),
    fetchContacts(portal.projectId),
    loadContactStore(portal.contactsPath),
  ]);

  for (const c of refreshed) store[String(c.contact_id)] = c;
  if (options.persistContacts !== false && refreshed.length > 0) {
    await saveContactStore(portal.contactsPath, store);
  }

  const contacts = Object.values(store);
  const byId = new Map(contacts.map((c) => [c.contact_id, c]));
  const outcomes = rollUpOutcomes(calls);

  // Every contact that exists in the store or has been called at all.
  const allContactIds = new Set<number>([...byId.keys(), ...calls.map((c) => c.contact_id)]);

  const nameOf = (id: number) => {
    const c = byId.get(id);
    return c ? contactName(c) : `Contact ${id}`;
  };
  const orgOf = (id: number) => byId.get(id)?.company?.trim() ?? "";

  const completedInterviews: NameDateOrg[] = [];
  const scheduledInterviews: NameDateOrg[] = [];
  const toBeRescheduled: NameOrg[] = [];
  const declined: DeclinedRow[] = [];
  const deceased: DeceasedRow[] = [];

  let inCallingProcess = 0;

  for (const id of allContactIds) {
    const outcome = outcomes.get(id);
    const contact = byId.get(id);
    const scheduledAt = contact?.scheduled_call_date_time ?? null;

    if (outcome?.status === "completed") {
      completedInterviews.push({ name: nameOf(id), org: orgOf(id), date: formatDate(outcome.lastDate) });
    } else if (outcome?.status === "declined") {
      declined.push({ name: nameOf(id), org: orgOf(id), reason: "" });
    } else if (outcome?.status === "deceased") {
      deceased.push({ name: nameOf(id), reason: "Passed Away" });
    } else if (outcome?.status === "rescheduled") {
      toBeRescheduled.push({ name: nameOf(id), org: orgOf(id) });
    } else if (scheduledAt && new Date(scheduledAt) >= asOf) {
      scheduledInterviews.push({ name: nameOf(id), org: orgOf(id), date: formatDate(scheduledAt) });
    } else if (outcome?.status !== "closed") {
      inCallingProcess++;
    }
  }

  const sortByName = <T extends { name: string }>(rows: T[]) =>
    rows.sort((a, b) => a.name.localeCompare(b.name));
  sortByName(declined);
  sortByName(toBeRescheduled);
  completedInterviews.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Declines carry a free-text reason that lives in the caller's notes rather
  // than a structured field, so any reason a human previously entered for the
  // same person is carried forward instead of being blanked out.
  const prev = options.previous;
  const namedCompleted = backfillNames(completedInterviews, prev?.completedInterviews);
  const namedScheduled = backfillNames(scheduledInterviews, prev?.scheduledInterviews);
  const namedRescheduled = backfillNames(toBeRescheduled, prev?.toBeRescheduled);
  const namedDeclined = backfillNames(declined, prev?.declined);
  completedInterviews.splice(0, completedInterviews.length, ...namedCompleted);
  scheduledInterviews.splice(0, scheduledInterviews.length, ...namedScheduled);
  toBeRescheduled.splice(0, toBeRescheduled.length, ...namedRescheduled);
  declined.splice(0, declined.length, ...namedDeclined);

  const previousReasons = new Map((options.previous?.declined ?? []).map((d) => [d.name, d.reason]));
  for (const row of declined) {
    if (!row.reason) row.reason = previousReasons.get(row.name) ?? "";
  }
  // Same for deceased, which has no VanillaSoft result code on most projects.
  const previousDeceased = options.previous?.deceased ?? [];
  const mergedDeceased: DeceasedRow[] =
    deceased.length > 0
      ? deceased
      : previousDeceased.filter((d) => !completedInterviews.some((c) => c.name === d.name));

  const emailEvents = calls.filter((c) => isEmailResult(c.result_code)).length;
  const dialEvents = calls.length - emailEvents;

  const tierCounts = [0, 0, 0, 0, 0];
  for (const c of contacts) {
    const t = tierNumber(customField(c, "Tier"));
    if (t) tierCounts[t - 1]++;
  }

  // Tiers live on the contact record, so they are only trustworthy once the
  // store covers the whole prospect pool. Until it does (a project that was
  // already running before the sync existed), the last known-good tier split
  // is kept rather than publishing an undercount.
  const storeCoversPool = contacts.length >= allContactIds.size;
  const prevStats = options.previous?.stats;
  const tiers = storeCoversPool || !prevStats
    ? tierCounts
    : [prevStats.tier1, prevStats.tier2, prevStats.tier3, prevStats.tier4, prevStats.tier5];

  const stats: JagStats = {
    totalProspects: allContactIds.size,
    tier1: tiers[0],
    tier2: tiers[1],
    tier3: tiers[2],
    tier4: tiers[3],
    tier5: tiers[4],
    dials: dialEvents,
    emailsSent: emailEvents,
    completed: completedInterviews.length,
    scheduled: scheduledInterviews.length,
    toBeRescheduled: toBeRescheduled.length,
    declined: declined.length,
    deceased: mergedDeceased.length,
    inCallingProcess,
  };

  // Survey panels are built from contacts who actually completed an interview.
  const completedIds = new Set(
    [...outcomes.entries()].filter(([, o]) => o.status === "completed").map(([id]) => id)
  );
  const respondents = contacts.filter(
    (c) => completedIds.has(c.contact_id) && (c.custom_fields ?? []).some((f) => /^Survey \S+ Answer:$/.test(f.name) && f.value.trim())
  );

  const feasibilitySignals = portal.signals
    .map((s) => buildSignal(s, respondents))
    .filter((s): s is FeasibilitySignal => s !== null);

  const data: JagDashboardData = {
    reportDate: asOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    updatedAt: asOf.toISOString(),
    surveyRespondentCount: respondents.length,
    stats,
    previousStats: options.previous?.stats
      ? {
          totalProspects: options.previous.stats.totalProspects,
          completed: options.previous.stats.completed,
          scheduled: options.previous.stats.scheduled,
          toBeRescheduled: options.previous.stats.toBeRescheduled,
          declined: options.previous.stats.declined,
          deceased: options.previous.stats.deceased,
          inCallingProcess: options.previous.stats.inCallingProcess,
          dials: options.previous.stats.dials,
          emailsSent: options.previous.stats.emailsSent,
        }
      : undefined,
    completedInterviews,
    scheduledInterviews,
    toBeRescheduled,
    declined,
    deceased: mergedDeceased,
    feasibilitySignals,
    missionThemes: buildMissionThemes(portal.missionThemeQuestion, respondents),
    quotes: buildQuotes(portal.quoteQuestions, respondents),
  };

  return {
    data,
    meta: {
      projectId: portal.projectId,
      callRecords: calls.length,
      contactsKnown: contacts.length,
      contactsRefreshed: refreshed.length,
      tierSource: storeCoversPool ? "vanillasoft" : "carried-forward",
      historyFrom: start.toISOString().slice(0, 10),
      historyTo: asOf.toISOString().slice(0, 10),
    },
  };
}
