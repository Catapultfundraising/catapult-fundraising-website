"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, CalendarCheck, ClipboardCheck, FileDown, Lock } from "lucide-react";
import { MEETING_LINK } from "@/lib/constants";
import { trackLeadSubmission } from "@/lib/analytics";
import {
  AREAS,
  LEGACY_RANGE_NOTE,
  QUESTIONS,
  buildLoyaltyReport,
  encodeAnswers,
  isComplete,
  type Answers,
  type TrackResult,
} from "@/lib/donor-loyalty";

const UNLOCK_KEY = "catapult-loyalty-unlocked";
const ORG_KEY = "catapult-loyalty-org";
const DONORS_KEY = "catapult-loyalty-donors";
const EMAIL_KEY = "catapult-loyalty-email";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

function parseNumber(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function LeadGate({ onUnlock }: { onUnlock: (donors: number, org: string, email: string) => void }) {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [donorsInput, setDonorsInput] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const donors = parseNumber(donorsInput);
    if (!donors) {
      setError("Enter roughly how many active donors you have. An estimate is fine.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/loyalty-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "start", name, org, email, totalDonors: donors, company, startedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      trackLeadSubmission("donor_loyalty_assessment");
      try {
        window.localStorage.setItem(UNLOCK_KEY, "1");
        window.localStorage.setItem(DONORS_KEY, String(donors));
        window.localStorage.setItem(EMAIL_KEY, email.trim());
        if (org.trim()) window.localStorage.setItem(ORG_KEY, org.trim());
      } catch {
        // Private browsing can block storage. The tool still works for this visit.
      }
      onUnlock(donors, org.trim(), email.trim());
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
        Find the donors nobody is talking to
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
        Sixteen questions, about three minutes. You get a grade on two tracks, legacy giving and
        mid-level engagement, a recommendation on which one to start with, and three next steps. Every
        number we ask for can be an estimate.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dl-name" className="text-[rgb(var(--navy))]">
              Name
            </Label>
            <Input
              id="dl-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Jane Donor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-org" className="text-[rgb(var(--navy))]">
              Organization
            </Label>
            <Input
              id="dl-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Your nonprofit"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dl-email" className="text-[rgb(var(--navy))]">
              Work email
            </Label>
            <Input
              id="dl-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLASS}
              placeholder="you@organization.org"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-donors" className="text-[rgb(var(--navy))]">
              Active donors, best estimate
            </Label>
            <Input
              id="dl-donors"
              inputMode="numeric"
              required
              value={donorsInput}
              onChange={(e) => {
                const parsed = parseNumber(e.target.value);
                setDonorsInput(parsed ? parsed.toLocaleString("en-US") : "");
              }}
              className={FIELD_CLASS}
              placeholder="4,000"
            />
          </div>
        </div>

        {/* Honeypot: hidden from real visitors. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="dl-company">Company</label>
          <input
            id="dl-company"
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
          We use your email to send fundraising resources and will never sell or share it.
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

function TrackCard({ track }: { track: TrackResult }) {
  return (
    <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            {track.label}
          </p>
          <div className="mt-2 flex items-end gap-4">
            <p className="font-display text-5xl leading-none text-[rgb(var(--navy))]">{track.grade}</p>
            <p className="pb-1 text-lg text-[rgb(var(--ink))]/60">{track.score} out of 100</p>
          </div>
        </div>
      </div>
      <div className="mt-7 space-y-6">
        {track.areas.map((result) => (
          <div key={result.area.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-[17px] font-semibold text-[rgb(var(--navy))]">{result.area.label}</p>
              <p className="text-sm text-[rgb(var(--ink))]/60">
                <span className="font-display text-xl text-[rgb(var(--navy))]">{result.grade}</span> ·{" "}
                {result.score}/100
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
      <div className="mt-7 rounded-2xl bg-[rgb(var(--paper))] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Biggest gap
        </p>
        <p className="mt-2 text-[17px] font-semibold text-[rgb(var(--navy))]">
          {track.biggestGap.area.label}
        </p>
        <p className="mt-2 text-[rgb(var(--ink))]/70">{track.biggestGap.area.risk}</p>
      </div>
    </div>
  );
}

export function DonorLoyaltyAssessment() {
  const [unlocked, setUnlocked] = useState(false);
  const [totalDonors, setTotalDonors] = useState(4000);
  const [donorsInput, setDonorsInput] = useState("4,000");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [loyalInput, setLoyalInput] = useState("");
  const [midInput, setMidInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
      setOrg(window.localStorage.getItem(ORG_KEY) || "");
      setEmail(window.localStorage.getItem(EMAIL_KEY) || "");
      const savedDonors = Number(window.localStorage.getItem(DONORS_KEY));
      if (Number.isFinite(savedDonors) && savedDonors > 0) {
        setTotalDonors(savedDonors);
        setDonorsInput(savedDonors.toLocaleString("en-US"));
      }
    } catch {
      // Storage unavailable; visitor just fills the form again.
    }
  }, []);

  const report = useMemo(
    () => buildLoyaltyReport({ org, totalDonors, answers }),
    [org, totalDonors, answers],
  );

  const pdfHref = useMemo(() => {
    const params = new URLSearchParams({
      donors: String(totalDonors),
      a: encodeAnswers(answers),
      lc: String(answers.loyalCount ?? 0),
      mc: String(answers.midCount ?? 0),
    });
    if (org) params.set("org", org);
    return `/api/loyalty-pdf?${params.toString()}`;
  }, [totalDonors, org, answers]);

  function setChoice(questionId: string, index: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function handleShowResults() {
    if (!isComplete(answers)) {
      setError("Answer every question, including the two that ask for a number. An estimate is fine.");
      return;
    }
    setError(null);
    setShowResults(true);
    try {
      await fetch("/api/loyalty-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "result",
          email,
          org,
          totalDonors,
          loyalCount: report.loyalCount,
          midCount: report.midCount,
          legacyScore: report.legacy.score,
          legacyGrade: report.legacy.grade,
          midScore: report.midlevel.score,
          midGrade: report.midlevel.grade,
          recommendation: report.recommendation.headline,
          projection: report.projection.headline,
        }),
      });
    } catch {
      // Nothing the visitor needs to see.
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("loyalty-results")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }

  if (!unlocked) {
    return (
      <LeadGate
        onUnlock={(donors, submittedOrg, submittedEmail) => {
          setOrg(submittedOrg);
          setEmail(submittedEmail);
          setTotalDonors(donors);
          setDonorsInput(donors.toLocaleString("en-US"));
          setUnlocked(true);
        }}
      />
    );
  }

  const legacyAreas = AREAS.filter((a) => a.track === "legacy");
  const midAreas = AREAS.filter((a) => a.track === "midlevel");

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
          Answer for how things work today, not how you would like them to work. Where we ask for a
          count, your best estimate is genuinely enough. Nobody is graded down for not having run the
          report yet.
        </p>

        <div className="mt-8 w-full max-w-sm space-y-2">
          <Label htmlFor="dl-donors-edit" className="text-[rgb(var(--navy))]">
            Active donors
          </Label>
          <Input
            id="dl-donors-edit"
            inputMode="numeric"
            value={donorsInput}
            onChange={(e) => {
              const parsed = parseNumber(e.target.value);
              setDonorsInput(parsed ? parsed.toLocaleString("en-US") : "");
              if (parsed > 0) setTotalDonors(parsed);
            }}
            className={`${FIELD_CLASS} h-14 text-2xl font-semibold`}
          />
        </div>

        {[
          { label: "Legacy and planned giving", areas: legacyAreas },
          { label: "Mid-level donor engagement", areas: midAreas },
        ].map((section) => (
          <div key={section.label} className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              {section.label}
            </p>
            <div className="mt-6 space-y-10">
              {section.areas.map((area) => (
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
                              value={question.id === "loyalCount" ? loyalInput : midInput}
                              onChange={(e) => {
                                const parsed = parseNumber(e.target.value);
                                const display = parsed ? parsed.toLocaleString("en-US") : "";
                                if (question.id === "loyalCount") setLoyalInput(display);
                                else setMidInput(display);
                                setAnswers((prev) => ({ ...prev, [question.id]: parsed }));
                              }}
                              className={FIELD_CLASS}
                              placeholder={question.id === "loyalCount" ? "400" : "250"}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

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
        <div id="loyalty-results" className="space-y-10">
          <div className="rounded-3xl bg-[rgb(var(--navy))] p-8 text-[rgb(var(--paper))] lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                  Our recommendation
                </p>
                <h2 className="mt-3 font-display text-3xl">{report.recommendation.headline}</h2>
              </div>
              <a
                href={pdfHref}
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--paper))]/30 px-5 py-2.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:border-[rgb(var(--brass))]"
              >
                <FileDown className="h-4 w-4" />
                Download branded PDF
              </a>
            </div>
            <p className="mt-5 text-[rgb(var(--paper))]/85">{report.recommendation.body}</p>
            <p className="mt-4 text-[rgb(var(--paper))]/75">{report.recommendation.second}</p>
          </div>

          <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              Legacy potential in your loyal pool
            </p>
            <h2 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">
              {report.projection.headline}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
              {report.projection.detail}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
              {LEGACY_RANGE_NOTE}
            </p>
            <div className="mt-6 rounded-2xl bg-[rgb(var(--paper))] p-5">
              <p className="text-[rgb(var(--ink))]/75">
                These are not prospects who are already on your radar. They are not in a major gift
                portfolio, nobody is calling them, and their gift sizes have kept them out of every
                report leadership looks at. They are also, quietly, the most loyal people in your
                file. Bringing them into a real relationship raises annual giving too: donors who
                document a planned gift give more each year, and they keep giving longer. The bequest
                is the second return, not the only one.
              </p>
            </div>
          </div>

          <TrackCard track={report.legacy} />

          <div className="rounded-3xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              Mid-level findings
            </p>
            <h2 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">
              What your mid-level band looks like
            </h2>
            <ul className="mt-5 space-y-3">
              {report.midFindings.map((finding) => (
                <li key={finding} className="flex gap-3 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[rgb(var(--brass))]" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          <TrackCard track={report.midlevel} />

          {report.nextSteps.length > 0 && (
            <div className="rounded-3xl bg-[rgb(var(--navy))] p-8 text-[rgb(var(--paper))] lg:p-10">
              <h2 className="font-display text-3xl">Do these three things next</h2>
              <ol className="mt-6 space-y-4">
                {report.nextSteps.map((step, index) => (
                  <li key={step.area} className="flex gap-4">
                    <span className="font-display text-2xl text-[rgb(var(--brass))]">{index + 1}</span>
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                        {step.area}
                      </span>
                      <span className="text-[rgb(var(--paper))]/85">{step.action}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-[rgb(var(--paper))]/75">
                A report card is a starting point for a conversation, not a verdict. Twenty minutes on
                the phone with your actual numbers will tell you more than any questionnaire can.
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
                  href="/services/legacy-giving"
                  className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--paper))]/30 px-7 py-3.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:border-[rgb(var(--brass))]"
                >
                  How a legacy program works
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
