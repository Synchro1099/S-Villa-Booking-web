"use client";

import { useRef, useState } from "react";
import { preload } from "react-dom";
import Image, { getImageProps } from "next/image";
import { Dialog as D } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Media } from "@/lib/media";

// The lightbox is at most max-w-6xl (1152px) wide.
const LIGHTBOX_SIZES = "(min-width: 1152px) 1152px, 100vw";
// Same higher quality as the gallery tiles (see next.config images.qualities).
const LIGHTBOX_QUALITY = 85;

/**
 * Which gallery item is open in the lightbox, plus the element that opened it
 * (tiles aren't Dialog.Triggers, so focus is returned there on close).
 */
export function useLightbox() {
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openAt = (i: number, from: HTMLElement) => {
    opener.current = from;
    setIndex(i);
  };
  return { index, setIndex, opener, openAt };
}

/** Full-screen view of one gallery item, uncropped, with previous/next, arrow keys and touch swipes. */
export function Lightbox({
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
  // Each item's real shape (width / height), learned when it loads; until then a guess from its orientation.
  // The frame is sized to it, so the caption and arrows sit right under the photo instead of at the
  // bottom of a tall screen.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const learn = (src: string, w: number, h: number) => w > 0 && h > 0 && setRatios((r) => (r[src] === w / h ? r : { ...r, [src]: w / h }));
  const ratio = item ? (ratios[item.src] ?? (item.orientation === "landscape" ? 3 / 2 : 3 / 4)) : 1;
  const step = (by: number) => index !== null && onIndex((index + by + items.length) % items.length);

  // Fetch the neighbours in the background so previous/next (and swipes) show instantly.
  // Photos use the same srcset/sizes as the lightbox <Image>, so the browser reuses the file;
  // clips only fetch their poster, not the whole video.
  if (index !== null && items.length > 1) {
    for (const i of new Set([(index + 1) % items.length, (index - 1 + items.length) % items.length])) {
      const m = items[i];
      if (m.kind === "video") {
        preload(m.poster, { as: "image", fetchPriority: "low" });
      } else {
        const { props } = getImageProps({ src: m.src, alt: "", fill: true, sizes: LIGHTBOX_SIZES, quality: LIGHTBOX_QUALITY });
        preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "low" });
      }
    }
  }

  // Touch swipes: left/right steps through the set, down closes. The media follows the finger
  // and springs back if the swipe is too short.
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const settle = () => {
    const el = stage.current;
    if (!el) return;
    el.style.transition = "transform .25s var(--ease-soft), opacity .25s var(--ease-soft)";
    el.style.transform = "";
    el.style.opacity = "";
  };
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" || !e.isPrimary) return;
      // Pinch-zoomed in: leave the gesture to the browser.
      if ((window.visualViewport?.scale ?? 1) > 1.01) return;
      // Leave a clip's control bar (scrubbing) alone.
      const t = e.target;
      if (t instanceof HTMLVideoElement && e.clientY > t.getBoundingClientRect().bottom - 64) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      const el = stage.current;
      if (!d || d.id !== e.pointerId || !el) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      el.style.transition = "none";
      if (Math.abs(dx) >= Math.abs(dy)) {
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = "";
      } else if (dy > 0) {
        el.style.transform = `translateY(${dy}px)`;
        el.style.opacity = String(Math.max(0.4, 1 - dy / 400));
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      settle();
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3 && items.length > 1) step(dx < 0 ? 1 : -1);
      else if (dy > 100 && dy > Math.abs(dx) * 1.3) onIndex(null);
    },
    onPointerCancel: () => {
      drag.current = null;
      settle();
    },
  };

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
            <div className="flex max-w-full flex-col gap-3" style={{ width: `min(100%, 72rem, calc((100dvh - 8rem) * ${ratio}))` }}>
              {/* The whole item, uncropped, as large as the screen allows at its own shape.
                  touch-action keeps pinch-zoom but hands one-finger drags to the swipe handlers. */}
              <div ref={stage} {...swipe} className="relative w-full touch-pinch-zoom select-none" style={{ aspectRatio: ratio }}>
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
                    onLoadedMetadata={(e) => learn(item.src, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                    className="size-full object-contain"
                  />
                ) : (
                  <Image
                    key={item.src}
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes={LIGHTBOX_SIZES}
                    quality={LIGHTBOX_QUALITY}
                    draggable={false}
                    onLoad={(e) => learn(item.src, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-ivory">
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
            </div>
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
