"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { JagDashboardData } from "@/lib/jag-data";

type Status = "idle" | "parsing" | "previewing" | "saving" | "saved" | "error";

export function JagAdminForm() {
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [surveyFile, setSurveyFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [data, setData] = useState<JagDashboardData | null>(null);
  const [jsonText, setJsonText] = useState("");

  async function handleRun() {
    if (!reportFile || !surveyFile) {
      setError("Please attach both files first.");
      return;
    }
    setError(null);
    setWarnings([]);
    setStatus("parsing");
    try {
      const form = new FormData();
      form.append("report", reportFile);
      form.append("survey", surveyFile);
      const res = await fetch("/api/jag-admin/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong parsing the files.");
        setStatus("error");
        return;
      }
      setData(json.data);
      setJsonText(JSON.stringify(json.data, null, 2));
      setWarnings(json.warnings || []);
      setStatus("previewing");
    } catch {
      setError("Something went wrong parsing the files.");
      setStatus("error");
    }
  }

  async function handleSave() {
    setError(null);
    setStatus("saving");
    let parsed: JagDashboardData;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError("The data below isn't valid JSON — check for a stray comma or quote before saving.");
      setStatus("previewing");
      return;
    }
    try {
      const res = await fetch("/api/jag-admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save.");
        setStatus("previewing");
        return;
      }
      setStatus("saved");
    } catch {
      setError("Failed to save. Please try again.");
      setStatus("previewing");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        JAG Nevada · Internal Tool
      </p>
      <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">Weekly Data Update</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[rgb(var(--ink))]/65">
        Upload this week&apos;s Weekly Interview Status Report (PDF) and Feasibility Survey Results
        (Excel). Click <strong>Run</strong> to parse them into the dashboard&apos;s data. Review the
        preview below — the summary numbers and most tables are read automatically and are usually
        exactly right, but the Declined table can occasionally need a quick fix — then click{" "}
        <strong>Save</strong> to publish it to <code>/jag-dashboard</code>.
      </p>

      <div className="mt-8 grid gap-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[rgb(var(--navy))]">
            Weekly Interview Status Report (PDF)
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setReportFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[rgb(var(--ink))]/70 file:mr-3 file:rounded-full file:border-0 file:bg-[rgb(var(--paper))] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[rgb(var(--navy))]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[rgb(var(--navy))]">
            Feasibility Survey Results (Excel)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setSurveyFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[rgb(var(--ink))]/70 file:mr-3 file:rounded-full file:border-0 file:bg-[rgb(var(--paper))] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[rgb(var(--navy))]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={status === "parsing" || !reportFile || !surveyFile}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--navy-deep))] disabled:opacity-50"
      >
        {status === "parsing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {status === "parsing" ? "Reading files..." : "Run"}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{w}</p>
            </div>
          ))}
        </div>
      )}

      {data && status !== "saved" && (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">Preview</p>
            <h2 className="mt-1 font-display text-xl text-[rgb(var(--navy))]">{data.reportDate}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Total Prospects", data.stats.totalProspects],
                ["Dials", data.stats.dials],
                ["Completed", data.stats.completed],
                ["Scheduled", data.stats.scheduled],
                ["To Reschedule", data.stats.toBeRescheduled],
                ["Declined", data.stats.declined],
                ["Deceased", data.stats.deceased],
                ["In Process", data.stats.inCallingProcess],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-[rgb(var(--line))] p-3">
                  <p className="font-display text-xl text-[rgb(var(--navy))]">{value}</p>
                  <p className="text-xs uppercase tracking-wide text-[rgb(var(--ink))]/55">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[rgb(var(--ink))]/55">
              Parsed rows — Completed: {data.completedInterviews.length}, Scheduled: {data.scheduledInterviews.length}
              , To Be Rescheduled: {data.toBeRescheduled.length}, Declined: {data.declined.length}, Deceased:{" "}
              {data.deceased.length}, Quotes found: {data.quotes.length}
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-[rgb(var(--navy))]">
              Raw data (edit if anything above looks off, then Save)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              className="mt-2 h-96 w-full rounded-xl border border-[rgb(var(--line))] p-4 font-mono text-xs text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-6 py-3 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {status === "saving" ? "Saving..." : "Save & Publish to /jag-dashboard"}
          </button>
        </div>
      )}

      {status === "saved" && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Saved.</p>
            <p className="mt-1">
              The dashboard at <code>/jag-dashboard</code> now shows this week&apos;s data. Refresh it to
              confirm.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
