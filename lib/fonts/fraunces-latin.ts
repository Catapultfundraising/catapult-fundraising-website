import localFont from "next/font/local";

// Keep this local identifier identical across the three subset modules:
// Next's local loader uses it as the shared CSS font-family.
const Fraunces = localFont({
  src: [
    { path: "../../public/fonts/fraunces/Fraunces-latin-normal.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-normal.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-italic.woff2", weight: "300", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-italic.woff2", weight: "400", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-italic.woff2", weight: "500", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-italic.woff2", weight: "600", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  preload: true,
  adjustFontFallback: false,
  fallback: ['"Fraunces Fallback"'],
  declarations: [{ prop: "unicode-range", value: "u+00??,u+0131,u+0152-0153,u+02bb-02bc,u+02c6,u+02da,u+02dc,u+0304,u+0308,u+0329,u+2000-206f,u+20ac,u+2122,u+2191,u+2193,u+2212,u+2215,u+feff,u+fffd" }],
});
export default Fraunces;
