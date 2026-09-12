"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, CalendarCheck, ClipboardCheck, FileDown, Lock } from "lucide-react";
import { MEETING_LINK } from "@/lib/constants";
import { trackLeadSubmission } from "@/lib/analytics";
import { formatCompactDollars, formatDollars, MAX_GOAL, MIN_GOAL } from "@/lib/gift-chart";
import {
  AREAS,
  QUESTIONS,
  buildReadinessReport,
  encodeAnswers,
  isComplete,
  type Answers,
} from "@/lib/campaign-readiness";

const UNLOCK_KEY = "catapult-readiness-unlocked";
const ORG_KEY = "catapult-readiness-org";
const GOAL_KEY = "catapult-readiness-goal";
const EMAIL_KEY = "catapult-readiness-email";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

function parseNumber(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function LeadGate({ onUnlock }: { onUnlock: (goal: number, org: string, email: string) => void }) {
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
    const goal = parseNumber(goalInput);
    if (!goal || goal < MIN_GOAL) {
      setError(`Enter a campaign goal of at least ${formatDollars(MIN_GOAL)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/readiness-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "start", name, org, email, goal, company, startedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      trackLeadSubmission("campaign_readiness_assessment");
      try {
        window.localStorage.setItem(UNLOCK_KEY, "1");
        window.localStorage.setItem(GOAL_KEY, String(goal));
        window.localStorage.setItem(EMAIL_KEY, email.trim());
        if (org.trim()) window.localStorage.setItem(ORG_KEY, org.trim());
      } catch {
        // Private browsing can block storage. The tool still works for this visit.
      }
      onUnlock(goal, org.trim(), email.trim());
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
        Grade your campaign readiness
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
        Sixteen questions, about three minutes. You get a grade in seven areas, the single biggest
        risk to your campaign named plainly, and three next steps you can take this quarter. No cost,
        and no obligation.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cr-name" className="text-[rgb(var(--navy))]">
              Name
            </Label>
            <Input
              id="cr-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Jane Donor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-org" className="text-[rgb(var(--navy))]">
              Organization
            </Label>
            <Input
              id="cr-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Your nonprofit"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cr-email" className="text-[rgb(var(--navy))]">
              Work email
            </Label>
            <Input
              id="cr-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLASS}
              placeholder="you@organization.org"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-goal" className="text-[rgb(var(--navy))]">
              Campaign goal you are considering
            </Label>
            <Input
              id="cr-goal"
              inputMode="numeric"
              required
              value={goalInput}
              onChange={(e) => {
                const parsed = parseNumber(e.target.value);
                setGoalInput(parsed ? parsed.toLocaleString("en-US") : "");
              }}
              className={FIELD_CLASS}
              placeholder="5,000,000"
            />
          </div>
        </div>

        {/* Honeypot: hidden from real visitors. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="cr-company">Company</label>
          <input
            id="cr-company"
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
          {submitting ? "Opening the questions..." : "Start the report card"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
        <p className="text-sm text-[rgb(var(--ink))]/55">
          We use your email to send campaign resources and will never sell or share it.
        </p>
      </form>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--line))]/60">
      <div
        className="h-full rounded-full bg-[rgb(var(--brass))]"
        style={{ width: `${Math.max(score, 2)}%` }}
      />
    </div>
  );
}

export function CampaignReadinessAssessment() {
  const [unlocked, setUnlocked] = useState(false);
  const [goal, setGoal] = useState(5_000_000);
  const [goalInput, setGoalInput] = useState("5,000,000");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [largestGiftInput, setLargestGiftInput] = useState("");
  const [prospectCountInput, setProspectCountInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
      setOrg(window.localStorage.getItem(ORG_KEY) || "");
      setEmail(window.localStorage.getItem(EMAIL_KEY) || "");
      const savedGoal = Number(window.localStorage.getItem(GOAL_KEY));
      if (Number.isFinite(savedGoal) && savedGoal >= MIN_GOAL) {
        setGoal(savedGoal);
        setGoalInput(savedGoal.toLocaleString("en-US"));
      }
    } catch {
      // Storage unavailable; visitor just fills the form again.
    }
  }, []);

  const report = useMemo(() => buildReadinessReport({ goal, org, answers }), [goal, org, answers]);

  const pdfHref = useMemo(() => {
    const params = new URLSearchParams({
      goal: String(goal),
      a: encodeAnswers(answers),
      lg: String(answers.largestGift ?? 0),
      pc: String(answers.prospectCount ?? 0),
    });
    if (org) params.set("org", org);
    return `/api/readiness-pdf?${params.toString()}`;
  }, [goal, org, answers]);

  function setChoice(questionId: string, index: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function handleShowResults() {
    if (!isComplete(answers)) {
      setError("Answer every question, including the two that ask for a number.");
      return;
    }
    setError(null);
    setShowResults(true);
    // Send the graded result so the lead record carries the score, not just the
    // fact that someone opened the tool. A failure here must not block them.
    try {
      await fetch("/api/readiness-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "result",
          email,
          org,
          goal,
          score: report.score,
          grade: report.grade,
          verdict: report.verdict.label,
          biggestRisk: report.biggestRisk.area.label,
          areas: report.areas.map((a) => ({ label: a.area.label, score: a.score, grade: a.grade })),
        }),
      });
    } catch {
      // Nothing the visitor needs to see.
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("readiness-results")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }

  if (!unlocked) {
    return (
      <LeadGate
        onUnlock={(submittedGoal, submittedOrg, submittedEmail) => {
          setOrg(submittedOrg);
          setEmail(submittedEmail);
          setGoal(submittedGoal);
          setGoalInput(submittedGoal.toLocaleString("en-US"));
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
        <div className="flex items-center gap-2 text-[rgb(var(--brass))]">
          <ClipboardCheck className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Report card</p>
        </div>
        <h2 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">
          Answer sixteen questions
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Answer the way things actually are today, not the way you hope they will be by the time you
          launch. Two questions are graded against your goal, so the grade reflects the campaign you
          are considering rather than a generic checklist.
        </p>

        <div className="mt-8 w-full max-w-sm space-y-2">
          <Label htmlFor="cr-goal-edit" className="text-[rgb(var(--navy))]">
            Campaign goal
          </Label>
          <Input
            id="cr-goal-edit"
            inputMode="numeric"
            value={goalInput}
            onChange={(e) => {
              const parsed = parseNumber(e.target.value);
              setGoalInput(parsed ? parsed.toLocaleString("en-US") : "");
              if (parsed >= MIN_GOAL && parsed <= MAX_GOAL) setGoal(parsed);
            }}
            className={`${FIELD_CLASS} h-14 text-2xl font-semibold`}
          />
          <p className="text-sm text-[rgb(var(--ink))]/55">
            Your goal needs a lead gift of about {formatCompactDollars(report.leadGift)} and roughly{" "}
            {report.prospectsNeeded.toLocaleString("en-US")} qualified prospects.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {AREAS.map((area) => (
            <div key={area.id}>
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">{area.label}</h3>
              <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">{area.why}</p>
              <div className="mt-5 space-y-6">
                {QUESTIONS.filter((q) => q.area === area.id).map((question) => (
                  <div key={question.id}>
                    <p className="text-[17px] font-semibold text-[rgb(var(--navy))]">
                      {question.prompt}
                    </p>
                    {question.help && (
                      <p className="mt-1 text-sm text-[rgb(var(--ink))]/55">{question.help}</p>
                    )}

                    {question.kind === "choice" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.choices?.map((choice, index) => {
                          const selected = answers[question.id] === index;
                          return (
                            <button
                              key={choice.label}
                              type="button"
                              onClick={() => setChoice(question.id, index)}
                              aria-pressed={selected}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                selected
                                  ? "border-[rgb(var(--brass))] bg-[rgb(var(--brass))] text-[rgb(var(--navy-deep))]"
                                  : "border-[rgb(var(--line))] text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]"
                              }`}
                            >
                              {choice.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 max-w-xs">
                        <Input
                          inputMode="numeric"
                          value={question.id === "largestGift" ? largestGiftInput : prospectCountInput}
                          onChange={(e) => {
                            const parsed = parseNumber(e.target.value);
                            const display = parsed ? parsed.toLocaleString("en-US") : "";
                            if (question.id === "largestGift") setLargestGiftInput(display);
                            else setProspectCountInput(display);
                            setAnswers((prev) => ({ ...prev, [question.id]: parsed }));
                          }}
                          className={FIELD_CLASS}
                          placeholder={question.id === "largestGift" ? "250,000" : "300"}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-8 flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleShowResults}
          className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]"
        >
          Show my report card
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {showResults && (
        <div id="readiness-results" className="space-y-10">
          <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                  Overall readiness
                </p>
                <div className="mt-2 flex items-end gap-4">
                  <p className="font-display text-6xl leading-none text-[rgb(var(--navy))]">
                    {report.grade}
                  </p>
                  <p className="pb-1 text-lg text-[rgb(var(--ink))]/60">{report.score} out of 100</p>
                </div>
                <p className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">
                  {report.verdict.label}
                </p>
              </div>
              <a
                href={pdfHref}
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] transition-colors hover:border-[rgb(var(--brass))]"
              >
                <FileDown className="h-4 w-4" />
                Download branded PDF
              </a>
            </div>
            <p className="mt-5 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
              {report.verdict.summary}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
              {report.leadGiftNote} {report.prospectNote}
            </p>
          </div>

          <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
            <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Your grades by area</h2>
            <div className="mt-6 space-y-6">
              {report.areas.map((result) => (
                <div key={result.area.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-[17px] font-semibold text-[rgb(var(--navy))]">
                      {result.area.label}
                    </p>
                    <p className="text-sm text-[rgb(var(--ink))]/60">
                      <span className="font-display text-xl text-[rgb(var(--navy))]">
                        {result.grade}
                      </span>{" "}
                      · {result.score}/100 · {Math.round(result.area.weight * 100)}% of the grade
                    </p>
                  </div>
                  <ScoreBar score={result.score} />
                  {result.weakest && (
                    <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/65">
                      {result.weakest.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[rgb(var(--navy))] p-8 text-[rgb(var(--paper))] lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              Biggest risk
            </p>
            <h2 className="mt-3 font-display text-3xl">{report.biggestRisk.area.label}</h2>
            <p className="mt-4 text-[rgb(var(--paper))]/80">{report.biggestRisk.area.risk}</p>

            {report.nextSteps.length > 0 && (
              <>
                <h3 className="mt-8 font-display text-2xl">Do these three things next</h3>
                <ol className="mt-4 space-y-4">
                  {report.nextSteps.map((step, index) => (
                    <li key={step.area} className="flex gap-4">
                      <span className="font-display text-2xl text-[rgb(var(--brass))]">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                          {step.area}
                        </span>
                        <span className="text-[rgb(var(--paper))]/85">{step.action}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <p className="mt-8 text-[rgb(var(--paper))]/75">
              A report card is a starting point for a conversation, not a verdict. {report.verdict.nextStep}
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
                href="/resources/gift-chart-calculator"
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--paper))]/30 px-7 py-3.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:border-[rgb(var(--brass))]"
              >
                See the gift chart for {formatCompactDollars(report.goal)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
