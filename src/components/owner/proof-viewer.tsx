/* eslint-disable @next/next/no-img-element -- signed Storage URLs via redirect; next/image can't optimise them */
"use client";

import { useRef, useState } from "react";
import { Dialog as D } from "radix-ui";
import { ExternalLink, FileText, ImageOff, Maximize2, X } from "lucide-react";

export interface ProofItem {
  id: string;
  mimeType: string;
  uploadedLabel: string;
}

/**
 * Payment proof review. Images load through /api/owner/proofs/[id], which
 * re-checks the OWNER role and redirects to a fresh 60-second signed URL — so
 * the private bucket is never exposed, and the lightbox always gets a valid URL
 * even when opened minutes after the page loaded.
 */
export function ProofViewer({ proofs }: { proofs: ProofItem[] }) {
  const [open, setOpen] = useState<ProofItem | null>(null);
  // The lightbox is opened from our own button (not a Dialog.Trigger), so
  // return focus there ourselves when it closes.
  const opener = useRef<HTMLElement | null>(null);

  if (proofs.length === 0) return <p className="mt-3 text-sm text-muted">No proof uploaded yet.</p>;

  return (
    <>
      <ul className="mt-3 grid gap-4">
        {proofs.map((p, i) => {
          const src = `/api/owner/proofs/${p.id}`;
          const label = proofs.length > 1 ? `Payment proof ${proofs.length - i}` : "Payment proof";
          return (
            <li key={p.id}>
              <p className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                <span className="font-semibold text-ink">
                  {label}
                  {i === 0 && proofs.length > 1 ? " (latest)" : ""}
                </span>
                <span>{p.uploadedLabel}</span>
              </p>
              {p.mimeType === "application/pdf" ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-4 transition-colors hover:border-forest"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-bad-bg text-bad">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-semibold">View PDF receipt</span>
                  <ExternalLink className="size-4 text-muted" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Thumbnail
                  src={src}
                  label={label}
                  onOpen={(el) => {
                    opener.current = el;
                    setOpen(p);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <D.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm data-[state=open]:animate-[lightbox-fade_.18s_ease-out]" />
          <D.Content
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[100dvh] w-auto max-w-[100vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center p-3 outline-none data-[state=open]:animate-[lightbox-zoom_.2s_ease-out] sm:p-6"
            aria-describedby={undefined}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              opener.current?.focus();
            }}
          >
            <D.Title className="sr-only">Payment proof{open ? ` uploaded ${open.uploadedLabel}` : ""}</D.Title>
            {open ? (
              <>
                <LightboxImage key={open.id} src={`/api/owner/proofs/${open.id}`} />
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={`/api/owner/proofs/${open.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-ivory/10 px-4 text-sm font-semibold text-ivory hover:bg-ivory/20"
                  >
                    <ExternalLink className="size-4" aria-hidden /> Open original
                  </a>
                  <D.Close className="inline-flex h-10 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-ink hover:bg-white">
                    <X className="size-4" aria-hidden /> Close
                  </D.Close>
                </div>
              </>
            ) : null}
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}

/** Catches images that already failed before hydration attached onError. */
function useImageFailure() {
  const [failed, setFailed] = useState(false);
  const ref = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  };
  return { failed, ref, onError: () => setFailed(true) };
}

function Thumbnail({ src, label, onOpen }: { src: string; label: string; onOpen: (el: HTMLElement) => void }) {
  const { failed, ref, onError } = useImageFailure();
  if (failed) return <PreviewUnavailable src={src} />;
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      className="group relative block w-full overflow-hidden rounded-xl border border-line bg-sand/60 transition-colors hover:border-forest"
      aria-label={`${label} — open larger view`}
    >
      <img ref={ref} src={src} alt={label} loading="lazy" onError={onError} className="mx-auto max-h-72 w-auto max-w-full object-contain" />
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-ivory opacity-90 transition-opacity group-hover:opacity-100">
        <Maximize2 className="size-3.5" aria-hidden /> Enlarge
      </span>
    </button>
  );
}

function LightboxImage({ src }: { src: string }) {
  const { failed, ref, onError } = useImageFailure();
  if (failed) return <PreviewUnavailable src={src} dark />;
  return (
    <img
      ref={ref}
      src={src}
      alt="Payment proof, full size"
      onError={onError}
      className="max-h-[calc(100dvh-5.5rem)] w-auto max-w-[calc(100vw-1.5rem)] rounded-lg object-contain shadow-lift sm:max-h-[calc(100dvh-7rem)] sm:max-w-[min(90vw,72rem)]"
    />
  );
}

function PreviewUnavailable({ src, dark = false }: { src: string; dark?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-8 text-center text-sm ${dark ? "border-ivory/20 text-ivory" : "border-line bg-white text-muted"}`}>
      <ImageOff className="size-6" aria-hidden />
      <p>The preview couldn&apos;t load.</p>
      <a href={src} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
        Open in a new tab
      </a>
    </div>
  );
}
