import { SUBMITTED_REVISION, SURVEY_VERSION, type SurveyAnswers, type SurveyIdentity, type SurveyWrite } from "./csnf-online-survey";

export interface SurveyFormData extends SurveyIdentity { answers: SurveyAnswers; website: string }
export interface SaveAck { id: string; revision: number; status: "draft" | "submitted"; updatedAt: string }
export type SavePhase = "idle" | "dirty" | "saving" | "saved" | "error" | "submitted";
export interface SaveView { phase: SavePhase; finalizing: boolean }
type WriteBody = SurveyWrite & { website: string };
type Sender = (body: WriteBody, keepalive?: boolean) => Promise<SaveAck>;
type Job = { body: SurveyWrite & { website: string }; sequence: number };
export class SurveyInputRejectedError extends Error {}
const clone = (data: SurveyFormData): SurveyFormData => JSON.parse(JSON.stringify(data));

export async function sendSurveyWrite(body: WriteBody, keepalive = false, request: typeof fetch = fetch, timeoutMs = 15000): Promise<SaveAck> {
  // Only ordinary transport is bounded. Page-exit keepalive is best-effort and
  // must not be aborted just because the document became hidden.
  const controller = keepalive ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const result = await request("/api/csnf-survey", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), keepalive, signal: controller?.signal,
    });
    const ack = await result.json();
    if (result.status === 400) throw new SurveyInputRejectedError("Please check your entries.");
    if (!result.ok || ack.ok !== true) throw new Error("Save not confirmed");
    return ack;
  } finally { if (timeout !== undefined) clearTimeout(timeout); }
}

// A single serialized ordinary writer; page-exit flush may race it, but gets a
// distinct greater immutable revision. Neither acknowledgements nor late writes
// can replace newer edits or a terminal submission.
export class SurveyAutosave {
  private current: SurveyFormData = { firstName: "", lastName: "", telephone: "", answers: {}, website: "" };
  private sequence = 0;
  private acknowledged = -1;
  private revision = 0;
  private pending: Job | null = null;
  private running: Promise<void> | null = null;
  private terminal = false;
  private finalWanted = false;
  private failed = false;
  constructor(private id: string, private token: string, private send: Sender, private emit: (view: SaveView) => void) {}
  private namesPresent() { return Boolean(this.current.firstName.trim() && this.current.lastName.trim()); }
  private notify(phase: SavePhase) { this.emit({ phase, finalizing: this.finalWanted }); }
  update(data: SurveyFormData) {
    if (this.finalWanted || this.terminal) return;
    if (JSON.stringify(this.current) === JSON.stringify(data)) return;
    this.current = clone(data); this.sequence++;
    this.notify(this.namesPresent() ? this.failed ? "error" : "dirty" : "idle");
  }
  private job(final: boolean): Job {
    return {
      sequence: this.sequence,
      body: {
        id: this.id, writeToken: this.token, revision: final ? SUBMITTED_REVISION : ++this.revision,
        status: final ? "submitted" : "draft", surveyVersion: SURVEY_VERSION, ...clone(this.current),
      },
    };
  }
  private accept(job: Job, ack: SaveAck) {
    if (ack.id !== job.body.id || ack.revision !== job.body.revision || ack.status !== job.body.status) throw new Error("Save not confirmed");
    this.acknowledged = Math.max(this.acknowledged, job.sequence);
    if (job.body.status === "submitted") this.terminal = true;
    this.failed = false;
  }
  flush(final = false): Promise<void> {
    if (this.terminal || !this.namesPresent()) return Promise.resolve();
    if (final) { this.finalWanted = true; this.notify("saving"); }
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain() {
    while (!this.terminal && this.namesPresent() && (this.pending || this.acknowledged < this.sequence || this.finalWanted)) {
      const job = this.pending ?? this.job(this.finalWanted);
      this.pending = job; this.notify("saving");
      try {
        this.accept(job, await this.send(job.body));
        this.pending = null;
      } catch (error) {
        // 400 is known not to have persisted; corrected edits may use a new
        // revision. Ambiguous/network failures retain the exact retry payload.
        if (error instanceof SurveyInputRejectedError) {
          this.pending = null;
          if (job.body.status === "submitted") this.finalWanted = false;
        }
        this.failed = true;
        if (!this.terminal) this.notify("error");
        return; // Explicit retry, never an infinite background retry loop.
      }
    }
    this.notify(this.terminal ? "submitted" : this.acknowledged === this.sequence ? "saved" : "dirty");
  }
  flushOnExit() {
    if (this.terminal || !this.namesPresent() || (!this.finalWanted && this.acknowledged === this.sequence)) return;
    // No public response GET or identity in the URL. Browser lifecycle flush is
    // best-effort; UI claims saved only after a matching server acknowledgement.
    const job = this.pending?.body.status === "submitted" ? this.pending : this.job(this.finalWanted);
    void this.send(job.body, true).then(ack => {
      this.accept(job, ack);
      if (this.terminal) this.notify("submitted");
      else if (this.acknowledged === this.sequence) this.notify("saved");
    }).catch(error => {
      if (!this.terminal) {
        if (error instanceof SurveyInputRejectedError && job.body.status === "submitted") {
          this.finalWanted = false;
          if (this.pending?.body.status === "submitted") this.pending = null;
        }
        this.failed = true; this.notify("error");
      }
    });
  }
}
