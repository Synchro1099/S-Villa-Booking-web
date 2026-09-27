import { describe, expect, it } from "vitest";
import { placeRows } from "@/components/media/place-rows";

const P = { orientation: "portrait" } as const;
const L = { orientation: "landscape" } as const;

/** Parse "row / col / rowEnd / colEnd" for one breakpoint. */
function areas(items: (typeof P | typeof L)[], cols: 2 | 3 | 4) {
  return placeRows(items).map((s) => {
    const [row, col, , end] = String((s as Record<string, string>)[`--at-${cols}`]).split(" / ").map(Number);
    return { row, col, end };
  });
}

/** Every row must be symmetric: the same number of spare half-tracks on each side. */
function expectRowsCentred(items: (typeof P | typeof L)[], cols: 2 | 3 | 4) {
  const tracks = cols * 2;
  const byRow = new Map<number, { col: number; end: number }[]>();
  for (const a of areas(items, cols)) byRow.set(a.row, [...(byRow.get(a.row) ?? []), a]);
  for (const cells of byRow.values()) {
    const first = Math.min(...cells.map((c) => c.col));
    const last = Math.max(...cells.map((c) => c.end));
    expect(first - 1).toBe(tracks + 1 - last);
    // No overlaps and no gaps inside the row.
    const sorted = [...cells].sort((a, b) => a.col - b.col);
    sorted.slice(1).forEach((c, i) => expect(c.col).toBe(sorted[i].end));
  }
}

describe("gallery rows layout", () => {
  // The live gallery: 3 landscapes + 9 portraits = 15 columns' worth of tiles.
  const live = [L, P, P, L, P, P, L, P, P, P, P, P];

  it("fills full rows edge to edge and centres a short one, at every breakpoint", () => {
    for (const cols of [2, 3, 4] as const) expectRowsCentred(live, cols);
  });

  it("centres a lone portrait in the last row on phones", () => {
    const last = areas(live, 2).at(-1)!;
    // 4 half-tracks; a portrait spans 2, so it sits in tracks 2–3.
    expect(last).toMatchObject({ col: 2, end: 4 });
  });

  it("lets a later portrait fill the gap a landscape leaves", () => {
    // 3 columns: P, P, then L doesn't fit → next row; the following P backfills row 1.
    const a = areas([P, P, L, P], 3);
    expect(a.map((x) => x.row)).toEqual([1, 1, 2, 1]);
    expectRowsCentred([P, P, L, P], 3);
  });

  it("handles an empty gallery and a single item", () => {
    expect(placeRows([])).toEqual([]);
    expect(areas([L], 4)[0]).toMatchObject({ row: 1, col: 3, end: 7 });
  });
});
