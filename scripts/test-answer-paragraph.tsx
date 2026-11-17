import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerParagraph } from "../components/answer-paragraph";
import { getAnswerBySlug } from "../lib/answers";

const answer = getAnswerBySlug("is-my-nonprofit-ready-for-a-capital-campaign")!;
const html = renderToStaticMarkup(<AnswerParagraph text={answer.answer[0]} links={answer.introLinks} />);
assert.equal((html.match(/<a /g) ?? []).length, 2);
assert.match(html, /href="\/services\/feasibility-study"/);
assert.match(html, /href="\/resources\/campaign-readiness-assessment"/);
assert.equal(html.replace(/<[^>]+>/g, ""), answer.answer[0]);
assert.equal(renderToStaticMarkup(<AnswerParagraph text="Plain & safe <text>" />), "Plain &amp; safe &lt;text&gt;");
const outOfOrder = renderToStaticMarkup(<AnswerParagraph text="First then second." links={[
  { label: "second", href: "/second" }, { label: "First", href: "/first" },
  { label: "", href: "/empty" }, { label: "absent", href: "/absent" },
]} />);
assert.ok(outOfOrder.indexOf('href="/first"') < outOfOrder.indexOf('href="/second"'));
assert.equal((outOfOrder.match(/<a /g) ?? []).length, 2);
assert.equal(outOfOrder.replace(/<[^>]+>/g, ""), "First then second.");
console.log("Answer paragraph links: all assertions passed");
