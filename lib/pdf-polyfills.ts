// pdf-parse (via pdfjs-dist internals) references the browser-only
// `DOMMatrix` global even for plain text extraction (no rendering/canvas
// involved). Node has no such global, which throws "DOMMatrix is not
// defined" the moment pdf-parse is imported in a serverless function.
// Importing this module first (for its side effect) installs a minimal,
// functional polyfill so pdf-parse loads and runs correctly in Node.
import DOMMatrix from "dommatrix";

if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = DOMMatrix;
}
