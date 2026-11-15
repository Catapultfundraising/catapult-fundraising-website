// Only header NAMES are taken from the approved portfolio template. Every workbook cell below is fictional.
import * as XLSX from "xlsx";
import { parseCsv } from "./csv-parse";
import { SAMPLE } from "./portfolio-preview";
export const PORTFOLIO_HEADERS = ["Primary Solicitor", "Secondary Solicitor", "CPTID", "Client_ID", "Relationship", "Profile Date", "Record Type", "Account Name", "First Name", "Middle Name", "Last Name", "Donor Type", "Title", "Formal Salutation", "DS Rating", "Wealth Capacity", "Address", "Address2", "City", "State", "Zip-Code", "Phone1", "Phone2", "Email1", "Email2", "Spouse First Name", "Spouse Middle Name", "Spouse Last Name", "First Gift Date", "First Gift Amount", "Last Gift Date", "Last Gift Amount", "Largest Gift Date", "Largest Gift Amount", "Total # of Gifts", "Total Gift Amount", "2024", "2025", "2026", "Previous Campaign Ask", "Campaign Ask", "Naming Opportunity", "2026 Solicitation Priority", "New Notes", "Historical Notes", "Task", "Due Date"];
export function syntheticPortfolioWorkbook() {
  const csv = parseCsv(SAMPLE), headers = csv[0];
  const rows = csv.slice(1).map(row => {
    const data = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
    return PORTFOLIO_HEADERS.map(h => data[h] || "");
  });
  rows[0][1] = "Synthetic secondary B"; rows[1][1] = "Attempted manual secondary replacement";
  const grid: unknown[][] = [...Array.from({ length: 6 }, (_, i) => [`Synthetic portfolio — title row ${i + 1}; no real donor data`]), PORTFOLIO_HEADERS, ...rows];
  const extra = (id: unknown, note: unknown, ask: unknown = "") => PORTFOLIO_HEADERS.map(h => h === "Client_ID" ? id : h === "New Notes" ? note : h === "Campaign Ask" ? ask : "");
  grid.push(extra("0001", "Formula identity — never append"), extra("0001", ""), extra("0001", "", ""), extra(1, "Numeric ID — never coerce"), extra("0002", "", 1500.25));
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  const cell = (r: number, h: string) => XLSX.utils.encode_cell({ r, c: PORTFOLIO_HEADERS.indexOf(h) });
  const firstExtra = 7 + rows.length;
  sheet[cell(firstExtra, "Client_ID")] = { t: "s", f: '"0001"', v: "0001" };
  sheet[cell(firstExtra + 1, "New Notes")] = { t: "s", f: 'CONCAT("cached"," note")', v: "Cached formula note — never append" };
  sheet[cell(firstExtra + 2, "Campaign Ask")] = { t: "n", f: "1000+500", v: 1500 };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["Synthetic instructions only"], ["Choose Capital_Campaign_Portfolio and header row 7."]]), "Instructions");
  XLSX.utils.book_append_sheet(book, sheet, "Capital_Campaign_Portfolio");
  XLSX.utils.book_append_sheet(book, structuredClone(sheet), "Alternate_Portfolio");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}
