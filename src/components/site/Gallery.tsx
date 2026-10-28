"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Media = { id: string; url: string; kind: string; captionFr: string | null; captionAr: string | null; altFr: string | null; altAr: string | null };

export function Gallery({ media, locale, title, fallback }: { media: Media[]; locale: string; title: string; fallback: string }) {
  const images = media.filter((m) => m.kind === "image" || m.kind === "floorplan");
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(images.length, 1)), [images.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1)), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, next, prev]);

  if (!images.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center border border-line bg-soft text-xs uppercase tracking-[0.16em] text-muted">
        {fallback}
      </div>
    );
  }

  const current = images[index]!;
  const caption = locale === "ar" ? current.captionAr : current.captionFr;

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden bg-soft">
        <button type="button" onClick={() => setOpen(true)} className="block h-full w-full cursor-zoom-in" aria-label={title}>
          <Image
            src={current.url}
            alt={(locale === "ar" ? current.altAr : current.altFr) || title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        </button>
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/50 bg-white/90 hover:bg-white"
            >
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                <path d="M7.5 1L1.5 7l6 6" stroke="#111" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/50 bg-white/90 hover:bg-white"
            >
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                <path d="M1.5 1l6 6-6 6" stroke="#111" strokeWidth="1.5" />
              </svg>
            </button>
            <span className="absolute bottom-3 end-3 bg-ink/80 px-2 py-1 text-[10px] tabular-nums tracking-[0.1em] text-white">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {caption ? <p className="mt-2 text-[11px] text-muted">{caption}</p> : null}

      {images.length > 1 ? (
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.slice(0, 6).map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${title} ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-[4/3] overflow-hidden border ${i === index ? "border-ink" : "border-transparent opacity-80 hover:opacity-100"}`}
            >
              <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-ink" role="dialog" aria-modal="true" aria-label={title}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-[11px] uppercase tracking-[0.16em]">
              {index + 1} / {images.length}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center border border-white/30 hover:bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="#fff" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={current.url} alt={(locale === "ar" ? current.altAr : current.altFr) || title} fill sizes="100vw" className="object-contain" />
            <button type="button" onClick={prev} aria-label="Previous" className="absolute start-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 text-white hover:bg-white/10">
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                <path d="M7.5 1L1.5 7l6 6" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </button>
            <button type="button" onClick={next} aria-label="Next" className="absolute end-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 text-white hover:bg-white/10">
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                <path d="M1.5 1l6 6-6 6" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
