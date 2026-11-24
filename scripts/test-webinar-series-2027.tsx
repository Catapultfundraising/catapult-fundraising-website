import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WEBINARS_2027, formatWebinarDate } from "../lib/webinar-series-2027";
import { WebinarRegistration } from "../components/webinar-registration";
import { TEAM_PRESENTER_PROFILES, presenterProfileFor } from "../lib/team-presenter-profiles";

assert.equal(WEBINARS_2027.length, 12);
assert.equal(new Set(WEBINARS_2027.map((s) => s.slug)).size, 12);
assert.deepEqual(WEBINARS_2027.map((s) => s.date), [
  "2027-01-20", "2027-02-17", "2027-03-17", "2027-04-14",
  "2027-05-12", "2027-06-09", "2027-07-14", "2027-08-11",
  "2027-09-08", "2027-10-13", "2027-11-17", "2027-12-08",
]);
const dateParts = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", {
  timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
}).formatToParts(new Date(value));
for (const session of WEBINARS_2027) {
  assert.equal(session.learning_objectives.length, 3);
  assert.ok(session.description && session.presenter_name);
  for (const field of ["service", "service_links", "next_step"]) assert.ok(!(field in session), `No internal ${field} in public session data`);
  const presenter = presenterProfileFor(session.presenter);
  assert.ok(presenter.id && presenter.role && presenter.photo);
  assert.equal(new URL(presenter.photo).hostname, "galaxy-prod.tlcdn.com");
  assert.equal((new Date(session.end).valueOf() - new Date(session.start).valueOf()) / 60000, 60);
  for (const [zone, startHour, endHour] of [
    ["America/Los_Angeles", "11", "12"], ["America/Chicago", "13", "14"], ["America/New_York", "14", "15"],
  ]) {
    for (const [instant, hour] of [[session.start, startHour], [session.end, endHour]]) {
      const parts = dateParts(instant, zone);
      const part = (type: string) => parts.find((p) => p.type === type)?.value;
      assert.equal(part("hour"), hour);
      assert.equal(part("minute"), "30");
      assert.equal(`${part("year")}-${part("month")}-${part("day")}`, session.date);
    }
  }
  assert.ok(formatWebinarDate(session.date).endsWith("2027"));
  assert.ok(session.registration_url, "Each approved session has a registration link");
  const registration = new URL(session.registration_url);
  assert.equal(registration.protocol, "https:");
  assert.ok(registration.hostname.endsWith(".zoom.us"));
  assert.ok(registration.pathname.startsWith("/webinar/register/"));
  assert.equal(registration.search, "");
  assert.equal(registration.hash, "");
}
const pending = renderToStaticMarkup(<WebinarRegistration title="Session & topic" registrationUrl={null} />);
assert.match(pending, /Registration opens soon/);
assert.doesNotMatch(pending, /<a|<button|href=/);
assert.match(pending, /Session &amp; topic/);
const active = renderToStaticMarkup(<WebinarRegistration title="Session & topic" registrationUrl="https://example.org/registration-fixture" />);
assert.match(active, /href="https:\/\/example.org\/registration-fixture"/);
assert.match(active, /aria-label="Register for Session &amp; topic \(opens in a new tab\)"/);
assert.match(active, /rel="noopener noreferrer"/);
assert.doesNotMatch(active, /Registration opens soon/);

assert.match(fs.readFileSync("lib/constants.ts", "utf8").split("export const INSIGHTS_LINKS")[1], /href: "\/webinars"/);
assert.match(fs.readFileSync("components/site-footer.tsx", "utf8"), /href="\/webinars"/);
assert.match(fs.readFileSync("app/sitemap.ts", "utf8"), /"\/webinars"/);
assert.match(fs.readFileSync("components/site-header.tsx", "utf8"), /pathname === "\/webinars"/);
assert.equal(TEAM_PRESENTER_PROFILES.Anthony.role, "President & CEO");
assert.equal(TEAM_PRESENTER_PROFILES.Jeff.role, "Vice President of Client Development");
assert.equal(TEAM_PRESENTER_PROFILES.Gwen.role, "Vice President of Client Services");
assert.throws(() => presenterProfileFor("Unknown"), /Unknown webinar presenter/);
const team = fs.readFileSync("app/our-team/page.tsx", "utf8");
for (const name of Object.keys(TEAM_PRESENTER_PROFILES)) assert.ok(team.includes(`...TEAM_PRESENTER_PROFILES.${name}`));
assert.ok(team.includes('id={"id" in member ? member.id : undefined}'));
assert.ok(team.includes('scroll-mt-56'));
const page = fs.readFileSync("app/webinars/page.tsx", "utf8");
for (const required of ["PageHero", "CtaBand", "annual giving", "mid-level donors", "h-[88px] w-[88px] flex-none shrink-0", "presenter.photo", "presenter.role", "href={bioHref}", "Register for each session below.", "11:30am–12:30pm Pacific", "1:30–2:30pm Central", "2:30–3:30pm Eastern"]) assert.ok(page.includes(required));
assert.doesNotMatch(page, /CGA_WEBINAR|@\/lib\/webinars|CFRE|recording|pricing|zoom\.us|Service connection|service_links|next_step/);
console.log("2027 webinar series: 12 approved dates and Zoom URLs, 36 objectives, DST times, verified shared presenter profiles/bio targets, fixed circles, no internal service mappings, registration states and discovery PASS");
