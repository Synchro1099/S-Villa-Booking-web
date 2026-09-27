"use client";

import { useState } from "react";
import { GALLERY_CATEGORIES, type Category, type Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { GalleryGrid } from "./gallery-grid";

/** /gallery: filter chips ("All" plus each category that has items) above the grid. */
export function FilteredGallery({ items, layout }: { items: Media[]; layout: "rows" | "uniform" | "masonry" }) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const chips = [
    { id: "all" as const, label: "All", count: items.length },
    ...GALLERY_CATEGORIES.map((c) => ({ ...c, count: items.filter((m) => m.category === c.id).length })).filter((c) => c.count > 0),
  ];
  const shown = filter === "all" ? items : items.filter((m) => m.category === filter);

  return (
    <>
      <div role="group" aria-label="Filter the gallery" className="mt-10 flex flex-wrap gap-2">
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(c.id)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                on ? "border-forest bg-forest text-ivory" : "border-line bg-cream/60 text-ink hover:border-ink",
              )}
            >
              {c.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-ivory/15 text-ivory" : "bg-sand text-muted")}>{c.count}</span>
            </button>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "item" : "items"}
      </p>
      {/* Keyed by filter so the lightbox and clip players start fresh for the new set. */}
      <GalleryGrid key={filter} items={shown} layout={layout} className="mt-8" />
    </>
  );
}
