"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

interface DeckViewerProps {
  slides: string[];
  deckName: string;
}

/**
 * Presenting-first deck viewer: arrow keys, swipe, and a fullscreen toggle so a
 * rep can run the deck off a laptop or iPad in a meeting without opening
 * PowerPoint. Slides are flat images, so the first one is priority-loaded and
 * the rest are lazy.
 */
export function DeckViewer({ slides, deckName }: DeckViewerProps) {
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        if (next < 0) return 0;
        if (next > slides.length - 1) return slides.length - 1;
        return next;
      });
    },
    [slides.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await containerRef.current.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--navy))] shadow-sm"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchStartX.current = null;
          if (start === null || end === null) return;
          const delta = start - end;
          if (Math.abs(delta) < 40) return;
          go(delta > 0 ? 1 : -1);
        }}
      >
        <div className="relative aspect-[16/9] w-full">
          {slides.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`${deckName}, slide ${i + 1} of ${slides.length}`}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 1100px"
              className={`object-contain transition-opacity duration-200 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={i === index ? undefined : true}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--navy))]/70 p-2 text-[rgb(var(--paper))] transition-opacity hover:bg-[rgb(var(--navy))] disabled:opacity-0"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === slides.length - 1}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--navy))]/70 p-2 text-[rgb(var(--paper))] transition-opacity hover:bg-[rgb(var(--navy))] disabled:opacity-0"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Present fullscreen"}
          className="absolute right-3 top-3 rounded-full bg-[rgb(var(--navy))]/70 p-2 text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy))]"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        {slides.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? "w-8 bg-[rgb(var(--brass))]"
                : "w-2 bg-[rgb(var(--line))] hover:bg-[rgb(var(--brass))]/50"
            }`}
          />
        ))}
        <span className="ml-2 text-xs uppercase tracking-[0.2em] text-[rgb(var(--ink))]/50">
          {index + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
