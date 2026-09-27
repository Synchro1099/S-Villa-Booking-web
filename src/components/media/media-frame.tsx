import Image from "next/image";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { InViewVideo } from "./in-view-video";

// Literal class names so Tailwind generates them.
const RATIO = {
  "16/10": "aspect-[16/10]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "3/4": "aspect-[3/4]",
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
} as const;

export type Ratio = keyof typeof RATIO;

/**
 * A fixed-shape slot for a photo or clip. The media fills the frame
 * (object-fit: cover), centred unless it sets its own focus, so landscape and
 * portrait files both fit without bars or stretching. With no media it shows
 * `children` — the placeholder illustration.
 *
 * `ratio` sets the shape; omit it when the parent already sizes the frame
 * (e.g. a full-bleed background).
 */
export function MediaFrame({
  media,
  ratio,
  sizes,
  preload = false,
  alt,
  className,
  mediaClassName,
  children,
}: {
  media: Media | null | undefined;
  ratio?: Ratio;
  /** How wide the frame renders, so the browser picks a right-sized file, e.g. "(min-width: 1024px) 33vw, 50vw". */
  sizes: string;
  /** Load immediately — only for the first thing on screen (the hero). */
  preload?: boolean;
  /** Overrides media.alt; pass "" when surrounding text already describes the image. */
  alt?: string;
  className?: string;
  mediaClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", ratio && RATIO[ratio], className)}>
      {!media ? (
        children
      ) : media.kind === "video" ? (
        <InViewVideo src={media.src} poster={media.poster} focus={media.focus} eager={preload} className={mediaClassName} />
      ) : (
        <Image
          src={media.src}
          alt={alt ?? media.alt}
          fill
          sizes={sizes}
          preload={preload}
          // Files in public/media are resized and compressed on the fly; photo
          // URLs entered in the owner database can be on any host, so load those as-is.
          unoptimized={!media.src.startsWith("/")}
          className={cn("object-cover", mediaClassName)}
          style={media.focus ? { objectPosition: media.focus } : undefined}
        />
      )}
    </div>
  );
}
