// Strict RFC 4180 CSV parser shared by server routes and the browser (no node: imports).
export class CsvError extends Error {}
/** RFC 4180 parser: optional UTF-8 BOM, quoted fields with "" escapes and embedded newlines, CRLF/LF. Throws on malformed quotes. */
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.includes("\u0000")) throw new CsvError("File contains NUL bytes; save it as a plain CSV");
  const rows: string[][] = []; let row: string[] = []; let f = ""; let i = 0; let quoted = false; let wasQuoted = false;
  const endField = () => { row.push(f); f = ""; wasQuoted = false; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } quoted = false; i++; const n = text[i]; if (n !== undefined && n !== "," && n !== "\n" && n !== "\r") throw new CsvError(`Unexpected text after a closing quote (row ${rows.length + 1})`); continue; }
      f += c; i++; continue;
    }
    if (c === '"') { if (f !== "" || wasQuoted) throw new CsvError(`Stray quote inside an unquoted value (row ${rows.length + 1})`); quoted = true; wasQuoted = true; i++; continue; }
    if (c === ",") { endField(); i++; continue; }
    if (c === "\r") { if (text[i + 1] !== "\n") throw new CsvError("Bare carriage return line ending"); endRow(); i += 2; continue; }
    if (c === "\n") { endRow(); i++; continue; }
    f += c; i++;
  }
  if (quoted) throw new CsvError("Unterminated quoted value");
  if (f !== "" || row.length || wasQuoted) endRow();
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
