import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, string> = {};

  try {
    const { PDFParse } = await import("pdf-parse");
    results.pdfParse = typeof PDFParse === "function" ? "ok" : "loaded but not a function";
  } catch (err: any) {
    results.pdfParse = `ERROR: ${err?.message || err}`;
  }

  try {
    const docx = await import("docx");
    results.docx = typeof docx.Document === "function" ? "ok" : "loaded but Document missing";
  } catch (err: any) {
    results.docx = `ERROR: ${err?.message || err}`;
  }

  try {
    const askStrategy = await import("@/lib/ask-strategy");
    results.askStrategy = typeof askStrategy.extractClientAcronym === "function" ? "ok" : "loaded but fn missing";
  } catch (err: any) {
    results.askStrategy = `ERROR: ${err?.message || err}`;
  }

  try {
    const askStrategyDocx = await import("@/lib/ask-strategy-docx");
    results.askStrategyDocx = typeof askStrategyDocx.buildAskStrategyDocx === "function" ? "ok" : "loaded but fn missing";
  } catch (err: any) {
    results.askStrategyDocx = `ERROR: ${err?.message || err}`;
  }

  return NextResponse.json(results);
}
