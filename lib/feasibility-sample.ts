// Public metadata only. The PDF and images are private Blob objects, NEVER public/ or git.
export const SAMPLE_PATH = "/samples/feasibility-study";
export const SAMPLE_COOKIE = "catapult_feasibility_sample";
export const SAMPLE_PAGES = 126;
export const SAMPLE_SHA256 = "18cd8d1f5cbdf10e8d18575ec1c33a94ac95623aa34b93a63364ae752d0372f9";
export const SAMPLE_PREFIX = `sales-samples/feasibility-study/${SAMPLE_SHA256}/`;
export const SAMPLE_PDF_NAME = "Campaign Feasibility Study Sales Sample.pdf";
export function sampleAsset(name: string): { filename: string; contentType: string } | null {
  if (name === "document.pdf") return { filename: name, contentType: "application/pdf" };
  const match = /^page-(\d{3})\.webp$/.exec(name);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > SAMPLE_PAGES) return null;
  return { filename: name, contentType: "image/webp" };
}
