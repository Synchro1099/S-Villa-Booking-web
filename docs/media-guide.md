# Photos & videos guide

How to add or swap the site's photos and videos, and what to ask the client to shoot for each spot.

## How it works

- Every file lives in **`public/media/`**. Anything outside `public/` (for example `src/assets/`) is never served to visitors.
- Every slot is listed in **`src/lib/media.ts`**. A file only appears once its line there points at it. Adding a file to the folder isn't enough on its own.
- Each slot is a fixed-shape frame. The photo fills it and is centred, and whatever doesn't fit is cropped. Landscape and portrait files both work, with no stretching and no empty bars.
- An empty slot shows the placeholder illustration or icon, so a missing photo never breaks the page.
- Photos are resized and compressed automatically for each screen, so the full-size file is only downloaded where it's needed.

## Folders and file names

```
public/media/
  hero/          hero.jpg                     one landscape photo…
                 hero.mp4 + hero-poster.jpg   …or a short silent loop plus its still frame
  facilities/    pickleball.jpg
                 badminton.jpg
                 music-room.jpg
                 jacuzzi.jpg
                 bar-lounge.jpg
                 villa-courtyard.jpg
  gallery/       any-name.jpg                 photos, any orientation
                 any-name.mp4 + any-name-poster.jpg   clips, with a still frame named <clip>-poster.jpg
```

Naming rules: lowercase, words joined with hyphens, no spaces. Use `.jpg` for photos and `.mp4` for clips. A facility photo is named after the facility's slug (the list above).

## Adding or swapping a photo

1. Put the file in the right folder with the right name.
2. Open `src/lib/media.ts` and set the matching line:
   - **Hero:** `export const HERO_MEDIA: Media | null = photo("hero/hero.jpg", "The courtyard at dusk");`
     For a clip: `clip("hero/hero.mp4", "Walking from the lounge to the court")`. Set it back to `null` to show the illustration again.
   - **Facility:** change `jacuzzi: undefined,` to `jacuzzi: photo("facilities/jacuzzi.jpg", "The jacuzzi lit up at night"),`
   - **Gallery:** add a line to `GALLERY`, in the order you want it shown:
     `photo("gallery/lounge.jpg", "Lounge sofas by the bar"),`
     For a portrait shot, add `{ portrait: true }`: `photo("gallery/tree.jpg", "Courtyard tree", { portrait: true }),`
     For a clip: `clip("gallery/court-rally.mp4", "A rally on the court", { portrait: true }),`
3. **Swapping a file for a new one with the same name** only needs step 1.
4. If a crop cuts off the subject, add a focus point: `{ focus: "50% 30%" }` keeps the upper part, and `"left center"` keeps the left side.
5. The second argument is the description screen readers read out. Write what's in the shot.
6. Check it locally (`npm run dev`, then open http://localhost:3000), then commit and push. Vercel deploys every push to `main` automatically, and the site updates within a couple of minutes.

A facility photo URL saved in the database (`services.image_url`) takes precedence over `src/lib/media.ts`. Leave that column empty to use the files here.

## Gallery layout

`GALLERY_LAYOUT` in `src/lib/media.ts` switches how mixed shapes are arranged:

| Layout | Looks like | Good | Watch out for |
| --- | --- | --- | --- |
| `"rows"` (current) | Portrait tiles 3:4, landscape tiles 3:2 spanning two columns; rows line up | Tidy edges and little cropping for either orientation | The last row can end with a gap; tiles may appear slightly out of list order to fill holes |
| `"uniform"` | Every tile the same 4:5 box | Calmest, most "catalogue" look | Landscape shots lose about 40% of their width |
| `"masonry"` | Columns of 4:3 and 3:4 tiles, staggered | Casual, Pinterest-style | Uneven column bottoms; reads top-to-bottom per column, not across |

Tapping any tile opens the whole uncropped photo or clip, whichever layout is used.

## What to shoot for each spot (brief for the client)

| Spot | Orientation | Ideal size | Tips |
| --- | --- | --- | --- |
| **Hero** (top of homepage) | **Landscape**, wide (16:9 or wider) | 3000 px wide or more | Most important shot. The headline sits over the **left** side on computers, so put the interest on the right. Phones show only the **middle third** of the width, so the key subject should also work cropped to the centre. Even, soft light; dusk works well. |
| **Hero clip** (optional, instead of a photo) | **Landscape** 16:9 | 1920×1080 | 8–15 seconds that loops smoothly, slow and steady movement (walking or a slow pan), no sound needed. Keep it under ~8 MB. |
| **Facility cards** (6) | **Landscape** | 1600 px wide or more | Shown as a wide 16:10 frame. Subject in the centre with some space around it. Portrait shots work but keep only a middle band (a tall phone shot loses about two thirds). One clear shot per facility: court, badminton net, music room, jacuzzi, bar & lounge, courtyard. |
| **Gallery** | **Either** | 2000 px on the long side or more | Mix freely. Details, people enjoying the space (with permission), and evening lighting all work well here. |
| **Gallery clips** | **Either** (phone vertical is fine) | 720p–1080p | 5–15 seconds, silent, under ~8 MB each, plus one still frame saved as `<name>-poster.jpg`. |

General:

- Hold the phone steady and wipe the lens, and turn on the lights in indoor rooms.
- iPhones save **HEIC** by default, which most browsers can't show. Export or convert to **JPEG** before adding (on iPhone: *Settings → Camera → Formats → Most Compatible*).
- Before adding a photo, shrink it to about **2400–3000 px** on the long side (JPEG quality ~80%). The site resizes automatically, but smaller originals keep the repository and deploys light.
- To make a clip's poster, pause on a nice frame and screenshot it, or run `ffmpeg -ss 1 -i clip.mp4 -frames:v 1 -q:v 3 clip-poster.jpg`.
