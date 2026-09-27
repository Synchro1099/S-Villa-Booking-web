import { Maximize2, Play } from "lucide-react";
import type { Media } from "@/lib/media";
import { MediaFrame, type Ratio } from "./media-frame";

/** One gallery item as a button that opens the lightbox. Fills its parent unless `ratio` is given. */
export function GalleryTile({
  media: m,
  sizes,
  ratio,
  onOpen,
}: {
  media: Media;
  sizes: string;
  ratio?: Ratio;
  onOpen: (from: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      className="group relative block size-full overflow-hidden rounded-2xl bg-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-deep"
      aria-label={`${m.alt} — ${m.kind === "video" ? "play clip" : "view larger"}`}
    >
      <MediaFrame
        media={m}
        ratio={ratio}
        sizes={sizes}
        alt=""
        className={ratio ? undefined : "size-full"}
        mediaClassName="transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
      />
      <span className="absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-ink/60 text-ivory backdrop-blur-sm transition-colors group-hover:bg-ink/80" aria-hidden>
        {m.kind === "video" ? <Play className="size-3.5 translate-x-px fill-current" /> : <Maximize2 className="size-3.5" />}
      </span>
    </button>
  );
}
