"use client";

import { useEffect, useState } from "react";
import { DashboardHelp } from "@/components/dashboard-help";
import { DASHBOARD_TABS, type HelpClient } from "@/lib/dashboard-help";

// Mirrors the dashboards' header + sticky tab nav markup with synthetic text only.
export function Harness() {
  const [client, setClient] = useState<HelpClient | null>(null);
  const [tab, setTab] = useState("Overview");
  const [withHelp, setWithHelp] = useState(true);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setClient((p.get("client") as HelpClient) || "jag");
    setTab(p.get("tab") || "Overview");
    setWithHelp(p.get("help") !== "0");
  }, []);
  if (!client) return null;
  return (
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[rgb(var(--navy))] px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--brass-light))]">Synthetic QA harness · {client.toUpperCase()}</p>
          <h1 className="font-display mt-1 text-3xl">Sample Organization</h1>
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {DASHBOARD_TABS[client].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${t === tab ? "border-[rgb(var(--brass))] text-[rgb(var(--navy))]" : "border-transparent text-[rgb(var(--ink))]/60"}`}>{t}</button>
            ))}
          </div>
          {withHelp && <DashboardHelp client={client} currentTab={tab} />}
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-8"><p data-testid="panel" className="text-sm text-[rgb(var(--ink))]/60">Synthetic {tab} panel</p></div>
    </main>
  );
}
