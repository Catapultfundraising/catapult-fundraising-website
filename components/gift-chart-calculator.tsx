"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CalendarCheck, Lock, Printer, AlertCircle } from "lucide-react";
import { MEETING_LINK } from "@/lib/constants";
import { trackLeadSubmission } from "@/lib/analytics";
import {
  buildGiftChart,
  formatCompactDollars,
  formatDollars,
  MAX_GOAL,
  MIN_GOAL,
} from "@/lib/gift-chart";

const UNLOCK_KEY = "catapult-gift-chart-unlocked";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const PRESET_GOALS = [1_000_000, 3_000_000, 5_000_000, 10_000_000, 25_000_000];

function parseGoal(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function GiftPyramid({ rows, goal }: { rows: ReturnType<typeof buildGiftChart>["rows"]; goal: number }) {
  // The silhouette is a triangle: each level is a horizontal band whose width
  // grows as the gift level drops, which is the shape fundraisers already
  // recognize from a printed gift chart.
  const width = 720;
  const bandHeight = 62;
  const height = rows.length * bandHeight;
  const topWidth = 150;
  const maxWidth = width - 40;

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Gift pyramid for a ${formatDollars(goal)} campaign goal`}
      >
        {rows.map((row, i) => {
          const t = rows.length === 1 ? 1 : i / (rows.length - 1);
          const tNext = rows.length === 1 ? 1 : (i + 1) / (rows.length - 1);
          const top = topWidth + (maxWidth - topWidth) * t;
          const bottom = topWidth + (maxWidth - topWidth) * tNext;
          const y = i * bandHeight;
          const cx = width / 2;
          const points = [
            [cx - top / 2, y],
            [cx + top / 2, y],
            [cx + bottom / 2, y + bandHeight - 4],
            [cx - bottom / 2, y + bandHeight - 4],
          ]
            .map(([x, yy]) => `${x},${yy}`)
            .join(" ");

          // Bands lighten slightly down the pyramid, but stay dark enough that
          // white and brass label text keeps its contrast on every row.
          const shade = 0.95 - i * 0.05;

          return (
            <g key={row.level}>
              <polygon points={points} fill={`rgba(14, 30, 49, ${Math.max(shade, 0.68)})`} />
              <text
                x={cx}
                y={y + bandHeight / 2 - 2}
                textAnchor="middle"
                className="fill-white"
                style={{ fontSize: 16, fontWeight: 600 }}
              >
                {row.gifts} {row.gifts === 1 ? "gift" : "gifts"} at {formatCompactDollars(row.level)}
              </text>
              <text
                x={cx}
                y={y + bandHeight / 2 + 16}
                textAnchor="middle"
                fill="#D8B76A"
                style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}
              >
                {formatCompactDollars(row.value)} · {Math.round(row.shareOfGoal * 100)}% OF GOAL
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-sm text-[rgb(var(--ink))]/60">
        Each band is one gift level. The width shows how many gifts you need at that level, and the
        percentage shows how much of the goal that level carries.
      </figcaption>
    </figure>
  );
}

function LeadGate({ onUnlock }: { onUnlock: (goal: number) => void }) {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const goal = parseGoal(goalInput);
    if (!goal || goal < MIN_GOAL) {
      setError(`Enter a campaign goal of at least ${formatDollars(MIN_GOAL)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/gift-chart-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, org, email, goal, company, startedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      trackLeadSubmission("gift_chart_calculator");
      try {
        window.localStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        // Private browsing can block storage. The tool still works for this visit.
      }
      onUnlock(goal);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
      <div className="flex items-center gap-2 text-[rgb(var(--brass))]">
        <Lock className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">Free tool</p>
      </div>
      <h2 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">
        Build your gift chart
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
        Tell us where to send it and enter your goal. You will see your gift chart and pyramid on the
        next screen, and you can print or save it. No cost, and no obligation.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gc-name" className="text-[rgb(var(--navy))]">
              Name
            </Label>
            <Input
              id="gc-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Jane Donor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gc-org" className="text-[rgb(var(--navy))]">
              Organization
            </Label>
            <Input
              id="gc-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Your nonprofit"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gc-email" className="text-[rgb(var(--navy))]">
              Work email
            </Label>
            <Input
              id="gc-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLASS}
              placeholder="you@organization.org"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gc-goal" className="text-[rgb(var(--navy))]">
              Campaign goal
            </Label>
            <Input
              id="gc-goal"
              inputMode="numeric"
              required
              value={goalInput}
              onChange={(e) => {
                const parsed = parseGoal(e.target.value);
                setGoalInput(parsed ? parsed.toLocaleString("en-US") : "");
              }}
              className={FIELD_CLASS}
              placeholder="5,000,000"
            />
          </div>
        </div>

        {/* Honeypot: hidden from real visitors. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="gc-company">Company</label>
          <input
            id="gc-company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]"
        >
          {submitting ? "Building your chart..." : "Show my gift chart"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
        <p className="text-sm text-[rgb(var(--ink))]/55">
          We use your email to send campaign resources and will never sell or share it.
        </p>
      </form>
    </div>
  );
}

export function GiftChartCalculator() {
  const [unlocked, setUnlocked] = useState(false);
  const [goal, setGoal] = useState(5_000_000);
  const [goalInput, setGoalInput] = useState("5,000,000");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
    } catch {
      // Storage unavailable; visitor just fills the form again.
    }
  }, []);

  const chart = useMemo(() => buildGiftChart(goal), [goal]);
  const overGoal = chart.total > chart.goal;

  if (!unlocked) {
    return (
      <LeadGate
        onUnlock={(submittedGoal) => {
          setGoal(submittedGoal);
          setGoalInput(submittedGoal.toLocaleString("en-US"));
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm print:border-0 print:shadow-none lg:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="w-full max-w-sm space-y-2">
            <Label htmlFor="goal" className="text-[rgb(var(--navy))]">
              Campaign goal
            </Label>
            <Input
              id="goal"
              inputMode="numeric"
              value={goalInput}
              onChange={(e) => {
                const parsed = parseGoal(e.target.value);
                setGoalInput(parsed ? parsed.toLocaleString("en-US") : "");
                if (parsed >= MIN_GOAL && parsed <= MAX_GOAL) setGoal(parsed);
              }}
              className={`${FIELD_CLASS} h-14 text-2xl font-semibold`}
            />
            <p className="text-sm text-[rgb(var(--ink))]/55">
              Anything from {formatDollars(MIN_GOAL)} to {formatCompactDollars(MAX_GOAL)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {PRESET_GOALS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setGoal(preset);
                  setGoalInput(preset.toLocaleString("en-US"));
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  goal === preset
                    ? "border-[rgb(var(--brass))] bg-[rgb(var(--brass))] text-[rgb(var(--navy-deep))]"
                    : "border-[rgb(var(--line))] text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]"
                }`}
              >
                {formatCompactDollars(preset)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { label: "Gifts needed", value: chart.totalGifts.toLocaleString("en-US") },
            { label: "Prospects to identify", value: chart.totalProspects.toLocaleString("en-US") },
            { label: "Lead gift", value: formatCompactDollars(chart.leadGift) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-[rgb(var(--paper))] p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {stat.label}
              </p>
              <p className="mt-2 font-display text-4xl text-[rgb(var(--navy))]">{stat.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          To raise {formatDollars(chart.goal)} you need roughly {chart.totalGifts} gifts, and about{" "}
          {chart.totalProspects} qualified prospects to produce them. The top three levels carry{" "}
          {Math.round(chart.topThreeLevelsShare * 100)} percent of the goal, which is why campaigns
          are won or lost in the quiet phase.
        </p>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm print:break-inside-avoid lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
            Suggested gift chart for {formatDollars(chart.goal)}
          </h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] transition-colors hover:border-[rgb(var(--brass))] print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print or save as PDF
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[rgb(var(--navy))]">
                {["Gifts needed", "Gift level", "Value of gifts", "Cumulative total", "Prospects"].map(
                  (h) => (
                    <th
                      key={h}
                      className="py-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--navy))]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row.level} className="border-b border-[rgb(var(--line))]">
                  <td className="py-3 text-[17px] font-semibold text-[rgb(var(--navy))]">{row.gifts}</td>
                  <td className="py-3 text-[17px] text-[rgb(var(--ink))]/80">{formatDollars(row.level)}</td>
                  <td className="py-3 text-[17px] text-[rgb(var(--ink))]/80">{formatDollars(row.value)}</td>
                  <td className="py-3 text-[17px] text-[rgb(var(--ink))]/80">
                    {formatDollars(row.cumulative)}
                  </td>
                  <td className="py-3 text-[17px] text-[rgb(var(--ink))]/80">{row.prospects}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-[rgb(var(--navy))] bg-[rgb(var(--paper))]">
                <td className="py-3 font-display text-lg text-[rgb(var(--navy))]">{chart.totalGifts}</td>
                <td className="py-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--navy))]">
                  Total
                </td>
                <td className="py-3 font-display text-lg text-[rgb(var(--navy))]">
                  {formatDollars(chart.total)}
                </td>
                <td className="py-3 text-[17px] text-[rgb(var(--ink))]/70">
                  {Math.round((chart.total / chart.goal) * 100)}% of goal
                </td>
                <td className="py-3 font-display text-lg text-[rgb(var(--navy))]">
                  {chart.totalProspects}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {overGoal && (
          <p className="mt-4 text-sm text-[rgb(var(--ink))]/60">
            Round gift levels do not always divide evenly into a goal, so this chart totals slightly
            above {formatDollars(chart.goal)}. A little headroom is normal, and useful.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm print:break-inside-avoid lg:p-10">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
          The same chart as a pyramid
        </h2>
        <GiftPyramid rows={chart.rows} goal={chart.goal} />
      </div>

      <div className="rounded-3xl bg-[rgb(var(--navy))] p-8 text-[rgb(var(--paper))] print:hidden lg:p-10">
        <h2 className="font-display text-3xl">What this chart can and cannot tell you</h2>
        <p className="mt-4 text-[rgb(var(--paper))]/75">
          A calculated chart is a planning tool. It shows the shape a campaign this size has to take,
          and it is usually the moment a board realizes the top of the chart is the whole ballgame.
          What it cannot tell you is whether your donors can fill it. That answer comes from your own
          prospect data and from candid interviews with the people you are counting on, which is
          exactly what a feasibility study produces.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href={MEETING_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02]"
          >
            <CalendarCheck className="h-4 w-4" />
            Book a 20-minute call
          </a>
          <Link
            href="/services/feasibility-study"
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--paper))]/30 px-7 py-3.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:border-[rgb(var(--brass))]"
          >
            How a feasibility study works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
