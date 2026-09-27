"use client";

import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { GalleryTile } from "./gallery-tile";
import { Lightbox, useLightbox } from "./lightbox";
import { placeRows } from "./place-rows";

type Layout = "rows" | "uniform" | "masonry";

/**
 * The full gallery as a grid. Tiles are fixed shapes chosen from each item's
 * orientation, so rows and columns stay tidy whatever the client sends;
 * tapping one opens the full, uncropped photo or clip in a lightbox.
 */
export function GalleryGrid({ items, layout, className }: { items: Media[]; layout: Layout; className?: string }) {
  const { index, setIndex, opener, openAt } = useLightbox();
  const placements = layout === "rows" ? placeRows(items) : [];

  return (
    <>
      {layout === "rows" ? (
        // Spacing is padding inside each cell (not grid gap), so a two-column
        // 3:2 landscape cell is exactly as tall as a one-column 3:4 portrait cell.
        // The grid has two tracks per column so a short row can be centred by half a tile.
        <ul className={cn("-mx-1.5 grid grid-cols-4 sm:-mx-2 md:grid-cols-6 lg:grid-cols-8", className)}>
          {items.map((m, i) => (
            <li
              key={m.src}
              className={cn(
                "p-1.5 [grid-area:var(--at-2)] sm:p-2 md:[grid-area:var(--at-3)] lg:[grid-area:var(--at-4)]",
                m.orientation === "landscape" ? "aspect-[3/2]" : "aspect-[3/4]",
              )}
              style={placements[i]}
            >
              <GalleryTile
                media={m}
                sizes={m.orientation === "landscape" ? "(min-width: 1024px) 50vw, (min-width: 768px) 67vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"}
                onOpen={(el) => openAt(i, el)}
              />
            </li>
          ))}
        </ul>
      ) : layout === "masonry" ? (
        <ul className={cn("columns-2 gap-3 sm:gap-4 md:columns-3", className)}>
          {items.map((m, i) => (
            <li key={m.src} className="mb-3 break-inside-avoid sm:mb-4">
              <GalleryTile media={m} ratio={m.orientation === "landscape" ? "4/3" : "3/4"} sizes="(min-width: 768px) 33vw, 50vw" onOpen={(el) => openAt(i, el)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}>
          {items.map((m, i) => (
            <li key={m.src}>
              <GalleryTile media={m} ratio="4/5" sizes="(min-width: 768px) 33vw, 50vw" onOpen={(el) => openAt(i, el)} />
            </li>
          ))}
        </ul>
      )}

      <Lightbox items={items} index={index} onIndex={setIndex} opener={opener} />
    </>
  );
}
