import type { CSSProperties } from "react";
import type { Media } from "@/lib/media";

/**
 * Where each tile goes in the "rows" layout on phones (2 columns), tablets (3)
 * and desktops (4), as CSS grid-area values in --at-2 / --at-3 / --at-4.
 *
 * Portraits take one column and landscapes two. Each tile goes in the first row
 * with room for it, so a later portrait can fill a gap a landscape left behind.
 * Any row that ends up short (usually the last) is centred. The grid has two
 * tracks per column, so even a one-tile gap centres exactly.
 */
export function placeRows(items: Pick<Media, "orientation">[]) {
  const widths = items.map((m) => (m.orientation === "landscape" ? 2 : 1));
  const styles = items.map(() => ({}) as Record<string, string>);
  for (const cols of [2, 3, 4]) {
    const used: number[] = [];
    const spot = widths.map((w) => {
      let row = used.findIndex((u) => cols - u >= w);
      if (row === -1) row = used.push(0) - 1;
      const start = used[row];
      used[row] += w;
      return { row, start, w };
    });
    spot.forEach(({ row, start, w }, i) => {
      const col = 2 * start + (cols - used[row]) + 1; // the row's spare columns, halved, in half-column tracks
      styles[i][`--at-${cols}`] = `${row + 1} / ${col} / ${row + 2} / ${col + 2 * w}`;
    });
  }
  return styles as CSSProperties[];
}
