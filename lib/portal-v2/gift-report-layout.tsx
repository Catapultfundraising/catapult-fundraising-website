import { cloneElement, isValidElement, type ReactNode } from "react";
import { View, Text, type ViewProps } from "@react-pdf/renderer";

/** builtAt is a Pacific wall-clock timestamp (YYYY-MM-DD HH:mm), not UTC. */
export function reportDataAsOf(builtAt: string): string {
  const day = builtAt?.slice(0, 10);
  const date = new Date(`${day}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day)
    throw new Error("Report live build date unavailable");
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

type Tracking = { activity?: { kind?: string }[]; prospects: Record<string, {
  updatedAt?: string; by?: string; _canonicalTracking?: { objectPresent: boolean };
}> } | null;
export function committeeInsight(tracking: Tracking, removed: { committed: number; disqualified: number }): string {
  if (removed.committed + removed.disqualified > 0)
    return `Committee updates applied: ${removed.committed} committed and ${removed.disqualified} disqualified prospects are off the chart.`;
  const committee = tracking?.activity?.filter(a => a.kind === "Committee update").length ?? 0;
  const activity = tracking?.activity?.length ?? 0;
  const prospects = Object.values(tracking?.prospects ?? {}).filter(p =>
    p._canonicalTracking ? p._canonicalTracking.objectPresent : !!(p.updatedAt || p.by)).length;
  const recorded = committee ? `${committee} committee updates` : activity ? `${activity} activity entries` : prospects ? `${prospects} prospect tracking updates` : "";
  return recorded ? `${recorded} recorded; no prospects have been removed as committed or disqualified yet.`
    : "No committee updates entered yet; statuses and solicitors fill in as the committee updates the portal.";
}

/** Page-flow siblings matter: a near-page-height band container can move
 * wholesale after the section title, leaving a title-only page. Keep only
 * labels unbreakable; full donor notes remain independently splittable. */
export function GiftLevelRows({ heading, columns, rows, empty }: {
  heading: ReactNode; columns: ReactNode; rows: ReactNode[]; empty: ReactNode;
}) {
  return <>
    <View wrap={false} minPresenceAhead={24}>{heading}{columns}</View>
    {rows.length ? rows.map((row, i) =>
      i === rows.length - 1 && isValidElement<ViewProps>(row)
        ? cloneElement(row, { style: [row.props.style ?? {}, { marginBottom: 10 }].flat() })
        : row
    ) : <View style={{ marginBottom: 10 }}>{empty}</View>}
  </>;
}

/** Fixed labels repeat only on the pages spanned by this table. The explicit
 * section break leaves the wide band tables behind; compact columns avoid gaps. */
export function BelowProspects({ title, rows, navy, line }: {
  title: string; rows: { cptid: number; name: string; ask: string; lifetime: string; notes?: string }[]; navy: string; line: string;
}) {
  const widths = [220, 80, 100, 120];
  return <View break style={{ marginBottom: 10, width: 520 }}>
    <View fixed style={{ backgroundColor: "#FFFFFF" }}>
      <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 13, color: navy, marginBottom: 6 }}>{title}</Text>
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: navy }}>
        {["Prospect", "CPTID", "Ask", "Lifetime"].map((text, i) =>
          <Text key={text} style={{ width: widths[i], fontSize: 7.4, fontWeight: 700, padding: 3, textAlign: i >= 2 ? "right" : "left" }}>{text}</Text>)}
      </View>
    </View>
    {rows.map(row => <View key={row.cptid} style={{ borderBottomWidth: 0.6, borderBottomColor: line }}>
      <View wrap={false} style={{ flexDirection: "row" }}>
        {[row.name, String(row.cptid), row.ask, row.lifetime].map((text, i) =>
          <Text key={i} style={{ width: widths[i], fontSize: 7.4, padding: 3, fontWeight: i === 0 ? 700 : 400, textAlign: i >= 2 ? "right" : "left" }}>{text}</Text>)}
      </View>
      {row.notes && <Text style={{ fontSize: 7.4, padding: 3, lineHeight: 1.35 }}>{row.notes}</Text>}
    </View>)}
  </View>;
}

export function ReportStatus({ text, line }: { text: string; line: string }) {
  return <Text style={{ fontSize: 6, fontWeight: 700, borderWidth: 0.6, borderColor: line, borderRadius: 6,
    paddingVertical: 1.5, paddingHorizontal: 4, textAlign: "center", opacity: 0.75 }}>{text.toUpperCase()}</Text>;
}
