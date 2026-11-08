"use client";
import { useEffect, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import { SAMPLE_PAGES, SAMPLE_PATH } from "@/lib/feasibility-sample";
import styles from "./feasibility-flipbook.module.css";

const imageUrl = (page: number) => `${SAMPLE_PATH}/media/page-${String(page).padStart(3, "0")}.webp`;
const pdfUrl = `${SAMPLE_PATH}/media/document.pdf`;

export function FeasibilityFlipbook() {
  const host = useRef<HTMLDivElement>(null), flip = useRef<PageFlip | null>(null);
  const [page, setPage] = useState(1), [zoom, setZoom] = useState(1);
  const [reduced, setReduced] = useState(false), [mobile, setMobile] = useState(false);
  const [paperWidth, setPaperWidth] = useState(400);
  const [error, setError] = useState(false), [ready, setReady] = useState(false);
  const [jump, setJump] = useState("1");
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)"), narrow = matchMedia("(max-width: 1023px)");
    const update = () => { setReduced(motion.matches); setMobile(narrow.matches); setPaperWidth(narrow.matches ? Math.min(500, window.innerWidth - 64) : 400); };
    update(); motion.addEventListener("change", update); window.addEventListener("resize", update);
    return () => { motion.removeEventListener("change", update); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => {
    if (reduced || error || !host.current) return;
    let disposed = false;
    // Let the library own its DOM so React never reconciles moved page nodes.
    const container = host.current;
    const root = document.createElement("div");
    container.replaceChildren(root);
    import("page-flip").then(({ PageFlip }) => {
      if (disposed) return;
      const nodes = Array.from({ length: SAMPLE_PAGES }, (_, i) => {
        const node = document.createElement("div");
        node.className = styles.sheet;
        node.dataset.page = String(i + 1);
        const img = document.createElement("img");
        img.alt = `Fictional feasibility study, page ${i + 1}`;
        img.decoding = "async"; img.draggable = false;
        img.addEventListener("error", () => setError(true));
        node.append(img); root.append(node); return node;
      });
      const book = new PageFlip(root, {
        width: paperWidth, height: Math.round(paperWidth * 792 / 612),
        size: "fixed", usePortrait: mobile, showCover: true, autoSize: true,
        flippingTime: 650, maxShadowOpacity: 0.22, mobileScrollSupport: false,
        useMouseEvents: true, clickEventForward: true, disableFlipByClick: false,
        swipeDistance: 35, startPage: page - 1,
      });
      flip.current = book;
      const loadNearby = (index: number) => {
        nodes.forEach((node, i) => {
          const img = node.firstElementChild as HTMLImageElement;
          if (Math.abs(i - index) <= 3 && !img.getAttribute("src")) img.src = imageUrl(i + 1);
        });
      };
      book.on("flip", e => { const n = Number(e.data); setPage(n + 1); setJump(String(n + 1)); loadNearby(n); });
      book.loadFromHTML(nodes); loadNearby(page - 1); setReady(true);
    }).catch(() => setError(true));
    return () => { disposed = true; flip.current?.destroy(); flip.current = null; container.replaceChildren(); setReady(false); };
    // Page changes are owned by the library; recreating on every turn loses animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, mobile, paperWidth, error]);
  function go(n: number, animate = false) {
    n = Math.max(1, Math.min(SAMPLE_PAGES, n));
    if (reduced) { setPage(n); setJump(String(n)); return; }
    if (animate && n > page) flip.current?.flipNext();
    else if (animate && n < page) flip.current?.flipPrev();
    else flip.current?.turnToPage(n - 1);
  }
  return <section className={styles.reader}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>An inside look</p><h1>Campaign feasibility study</h1>
        <p>A complete sample, from listening to a campaign-ready recommendation.</p></div>
      <a className={styles.meeting} href="https://go.catapultfr.com/meetings/anthonya">Talk with Anthony ↗</a>
    </header>
    <p className={styles.notice}>Fictional sales sample · Client and prospect identities and individual wealth capacities are fictionalized.</p>
    <div className={styles.toolbar} aria-label="Document controls">
      <div className={styles.paging}>
        <button aria-label="Previous page" disabled={page === 1 || (!reduced && !ready)} onClick={() => go(page - (mobile || reduced || page === 2 ? 1 : 2), true)}>← Previous</button>
        <form onSubmit={e => { e.preventDefault(); const n = Number(jump); if (Number.isInteger(n) && n >= 1 && n <= SAMPLE_PAGES) go(n); }}>
          <label htmlFor="sample-page">Page</label>
          <input id="sample-page" type="number" min="1" max={SAMPLE_PAGES} value={jump} onChange={e => setJump(e.target.value)} />
          <span>of {SAMPLE_PAGES}</span><button type="submit">Go</button>
        </form>
        <button aria-label="Next page" disabled={page >= SAMPLE_PAGES || (!reduced && !ready)} onClick={() => go(page + (mobile || reduced || page === 1 ? 1 : 2), true)}>Next →</button>
      </div>
      <div className={styles.actions}>
        <label htmlFor="sample-zoom">Zoom</label>
        <select id="sample-zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))}><option value="1">Fit</option><option value="1.5">150%</option><option value="2">200%</option></select>
        <a href={`${pdfUrl}?download=1`}>Download PDF ↓</a>
      </div>
    </div>
    <p className={styles.help}>{reduced ? "Reduced motion: single-page reading, without animation." : "Turn a corner, swipe, or use the controls. Focus the reader to use ← →, Home and End."}</p>
    {error ? <div className={styles.fallback} role="alert"><h2>Prefer a different way to read?</h2><p>The page viewer could not load. Open the original PDF in your browser or save a copy.</p><a href={pdfUrl} target="_blank" rel="noopener">Open the PDF ↗</a> · <a href={`${pdfUrl}?download=1`}>Download PDF</a></div> :
      <div className={styles.viewport} tabIndex={0} role="region" aria-label="Feasibility study reader" onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(page + (mobile || reduced || page === 1 ? 1 : 2), true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(page - (mobile || reduced || page === 2 ? 1 : 2), true); }
        if (e.key === "Home") { e.preventDefault(); go(1); }
        if (e.key === "End") { e.preventDefault(); go(SAMPLE_PAGES); }
      }}>
        <div className={styles.scale} style={{ width: `${paperWidth * (mobile || reduced ? 1 : 2) * zoom}px`, height: `${Math.round(paperWidth * 792 / 612) * zoom}px` }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: paperWidth * (mobile || reduced ? 1 : 2) }}>
            {reduced ? <img className={styles.still} style={{ width: paperWidth, height: Math.round(paperWidth * 792 / 612) }} src={imageUrl(page)} alt={`Fictional feasibility study, page ${page}`} onError={() => setError(true)} /> : <div ref={host} />}
          </div>
        </div>
      </div>}
    <footer className={styles.readerFooter}>
      <span aria-live="polite" aria-atomic="true">Page {page} of {SAMPLE_PAGES}{!mobile && !reduced && page > 1 && page < SAMPLE_PAGES ? ` · spread ${page}–${page + 1}` : ""}</span>
      <a href={pdfUrl} target="_blank" rel="noopener">Open original PDF ↗</a>
    </footer>
  </section>;
}
