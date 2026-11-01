"use client";

import { useEffect, useState } from "react";
import { ReportBuilder, type ReportExportPayload } from "@/components/report-builder";

export function Harness() {
  const [client, setClient] = useState<string | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => { setClient(new URLSearchParams(location.search).get("client") || "jag"); }, []);
  if (!client) return null;
  const downloadExport = async (p: ReportExportPayload, format: "pdf" | "xlsx") => {
    const r = await fetch(`/api/${client}-data-export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, format }) });
    if (!r.ok) { alert("Download failed"); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob());
    a.download = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") || "")?.[1] || `report.${format}`; a.click();
  };
  return (
    <main className="min-h-screen bg-[rgb(var(--paper))] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-xs uppercase tracking-widest text-[rgb(var(--ink))]/50">Synthetic QA harness · {client.toUpperCase()}{opened ? ` · opened CPTID ${opened}` : ""}</p>
        <ReportBuilder client={client} clientLabel="Synthetic Test Client" api={`/api/qa-report-fixture/${client}`} listsApi={`/api/qa-report-lists/${client}`} onOpen={setOpened} downloadExport={downloadExport} />
      </div>
    </main>
  );
}
