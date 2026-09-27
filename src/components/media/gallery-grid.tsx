"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Dialog as D } from "radix-ui";
import { ChevronLeft, ChevronRight, Maximize2, Play, X } from "lucide-react";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { MediaFrame, type Ratio } from "./media-frame";

type Layout = "rows" | "uniform" | "masonry";

/**
 * Tiles are fixed shapes chosen from each item's orientation, so rows and
 * columns stay tidy whatever the client sends; tapping one opens the full,
 * uncropped photo or clip in a lightbox.
 */
export function GalleryGrid({ items, layout }: { items: Media[]; layout: Layout }) {
  const [open, setOpen] = useState<number | null>(null);
  // Opened from our own buttons (not a Dialog.Trigger), so return focus there ourselves.
  const opener = useRef<HTMLElement | null>(null);

  const tile = (m: Media, i: number, ratio: Ratio | undefined, sizes: string, frameClass?: string) => (
    <button
      type="button"
      onClick={(e) => {
        opener.current = e.currentTarget;
        setOpen(i);
      }}
      className="group relative block size-full overflow-hidden rounded-2xl bg-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-deep"
      aria-label={`${m.alt} — ${m.kind === "video" ? "play clip" : "view larger"}`}
    >
      <MediaFrame
        media={m}
        ratio={ratio}
        sizes={sizes}
        alt=""
        className={frameClass}
        mediaClassName="transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
      />
      <span className="absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-ink/60 text-ivory backdrop-blur-sm transition-colors group-hover:bg-ink/80" aria-hidden>
        {m.kind === "video" ? <Play className="size-3.5 translate-x-px fill-current" /> : <Maximize2 className="size-3.5" />}
      </span>
    </button>
  );

  return (
    <>
      {layout === "rows" ? (
        // Spacing is padding inside each cell (not grid gap), so a two-column
        // 3:2 landscape cell is exactly as tall as a one-column 3:4 portrait cell.
        <ul className="-mx-1.5 mt-12 grid grid-flow-dense grid-cols-2 sm:-mx-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((m, i) => (
            <li key={m.src} className={cn("p-1.5 sm:p-2", m.orientation === "landscape" ? "col-span-2 aspect-[3/2]" : "aspect-[3/4]")}>
              {tile(m, i, undefined, m.orientation === "landscape" ? "(min-width: 1024px) 50vw, (min-width: 768px) 67vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw", "size-full")}
            </li>
          ))}
        </ul>
      ) : layout === "masonry" ? (
        <ul className="mt-12 columns-2 gap-3 sm:gap-4 md:columns-3">
          {items.map((m, i) => (
            <li key={m.src} className="mb-3 break-inside-avoid sm:mb-4">
              {tile(m, i, m.orientation === "landscape" ? "4/3" : "3/4", "(min-width: 768px) 33vw, 50vw")}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {items.map((m, i) => (
            <li key={m.src}>{tile(m, i, "4/5", "(min-width: 768px) 33vw, 50vw")}</li>
          ))}
        </ul>
      )}

      <Lightbox items={items} index={open} onIndex={setOpen} opener={opener} />
    </>
  );
}

function Lightbox({
  items,
  index,
  onIndex,
  opener,
}: {
  items: Media[];
  index: number | null;
  onIndex: (i: number | null) => void;
  opener: React.RefObject<HTMLElement | null>;
}) {
  const item = index === null ? null : items[index];
  const step = (by: number) => index !== null && onIndex((index + by + items.length) % items.length);

  return (
    <D.Root open={item !== null} onOpenChange={(o) => !o && onIndex(null)}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm data-[state=open]:animate-[lightbox-fade_.18s_ease-out]" />
        <D.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-3 outline-none data-[state=open]:animate-[lightbox-zoom_.2s_ease-out] sm:p-6"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        >
          <D.Title className="sr-only">{item?.alt ?? "Gallery"}</D.Title>
          {item ? (
            <>
              {/* The whole item, uncropped (object-contain), as large as the screen allows. */}
              <div className="relative h-[calc(100dvh-8rem)] w-full max-w-6xl">
                {item.kind === "video" ? (
                  <video
                    key={item.src}
                    src={item.src}
                    poster={item.poster}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="mx-auto h-full w-auto max-w-full object-contain"
                  />
                ) : (
                  <Image key={item.src} src={item.src} alt={item.alt} fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-contain" />
                )}
              </div>
              <div className="flex w-full max-w-6xl items-center justify-between gap-3 text-ivory">
                <p className="min-w-0 flex-1 truncate text-sm text-ivory/80">
                  <span className="mr-2 tabular-nums text-ivory/50">
                    {(index ?? 0) + 1} / {items.length}
                  </span>
                  {item.alt}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {items.length > 1 ? (
                    <>
                      <LightboxButton label="Previous" onClick={() => step(-1)}>
                        <ChevronLeft className="size-5" aria-hidden />
                      </LightboxButton>
                      <LightboxButton label="Next" onClick={() => step(1)}>
                        <ChevronRight className="size-5" aria-hidden />
                      </LightboxButton>
                    </>
                  ) : null}
                  <D.Close className="grid size-11 place-items-center rounded-full bg-ivory text-ink hover:bg-white" aria-label="Close">
                    <X className="size-5" aria-hidden />
                  </D.Close>
                </div>
              </div>
            </>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function LightboxButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-11 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20">
      {children}
    </button>
  );
}
