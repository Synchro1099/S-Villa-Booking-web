/**
 * Every photo and video on the public site, in one place.
 *
 * Files live in public/media/<slot>/ (see docs/media-guide.md for the folder
 * layout, file names and what to shoot for each slot). To add or swap one,
 * drop the file in its folder and point the matching line below at it. A slot
 * left empty shows the placeholder illustration instead, so nothing breaks
 * while a photo is still missing.
 *
 * Frames have a fixed shape and fill it (CSS object-fit: cover), so landscape
 * and portrait shots both work: the photo is centred and the overflow cropped.
 * If a crop cuts off the subject, pass `focus` — a CSS object-position such as
 * "50% 30%" (keep the upper part) or "left center".
 */

export type Orientation = "landscape" | "portrait";

interface MediaBase {
  /** Describes the scene for screen-reader users, e.g. "Lit pickleball court at night". */
  alt: string;
  orientation: Orientation;
  /** CSS object-position used when the frame crops the media. Defaults to "center". */
  focus?: string;
}

export interface Photo extends MediaBase {
  kind: "photo";
  src: string;
}

export interface Clip extends MediaBase {
  kind: "video";
  src: string;
  /** Still frame shown before (and instead of) playback. */
  poster: string;
}

export type Media = Photo | Clip;

interface Options {
  portrait?: boolean;
  focus?: string;
}

/** A photo in public/media, e.g. photo("gallery/court.jpg", "…"). */
export function photo(file: string, alt: string, { portrait = false, focus }: Options = {}): Photo {
  return { kind: "photo", src: `/media/${file}`, alt, orientation: portrait ? "portrait" : "landscape", focus };
}

/** A silent looping clip in public/media, with its poster saved next to it as <name>-poster.jpg. */
export function clip(file: string, alt: string, { portrait = false, focus }: Options = {}): Clip {
  return {
    kind: "video",
    src: `/media/${file}`,
    poster: `/media/${file.replace(/\.[a-z0-9]+$/i, "-poster.jpg")}`,
    alt,
    orientation: portrait ? "portrait" : "landscape",
    focus,
  };
}

/**
 * Homepage hero background: one wide landscape photo, or a short silent loop.
 * null keeps the illustrated court. For example:
 *   export const HERO_MEDIA: Media | null = photo("hero/hero.jpg", "The S-Villa courtyard at dusk");
 *   export const HERO_MEDIA: Media | null = clip("hero/hero.mp4", "Walking from the lounge to the court");
 */
export const HERO_MEDIA: Media | null = null;

/**
 * Facility card photos, keyed by the facility's slug. A facility without a
 * photo shows its icon. A photo URL set on the facility in the database takes
 * precedence over these.
 */
export const FACILITY_PHOTOS: Record<string, Photo | undefined> = {
  pickleball: photo("facilities/pickleball.jpg", "The indoor pickleball court under bright lights"),
  badminton: photo("facilities/badminton.jpg", "Badminton net set up across the court"),
  "ktv-lounge": photo("facilities/ktv-lounge.jpg", "The KTV lounge with its neon-lit bar, big screen and sofas"),
  jacuzzi: photo("facilities/jacuzzi.jpg", "The outdoor jacuzzi and plunge pool on the garden deck", { portrait: true }),
  "villa-courtyard": photo("facilities/villa-courtyard.jpg", "Trees and lounge chairs in the open-air courtyard"),
};

/**
 * How the gallery arranges mixed shapes:
 * - "rows":    portrait tiles take one column, landscape tiles two; every row lines up.
 * - "uniform": identical portrait-ish (4:5) tiles for everything; landscapes crop the most.
 * - "masonry": columns of 4:3 and 3:4 tiles; staggered, Pinterest-style.
 */
export const GALLERY_LAYOUT: "rows" | "uniform" | "masonry" = "rows";

/** Gallery, in display order. Mix photos and clips, landscape and portrait, freely. */
export const GALLERY: Media[] = [
  photo("gallery/court.jpg", "The indoor court with its high steel roof and bright lights"),
  clip("gallery/walkthrough.mp4", "Walking through the villa from the entrance", { portrait: true }),
  clip("gallery/bar-lounge.mp4", "The KTV lounge glowing in pink neon", { portrait: true }),
  // Facility photos can appear here too; the same file serves both.
  photo("facilities/ktv-lounge.jpg", "The KTV lounge with its neon-lit bar, big screen and sofas"),
  photo("facilities/jacuzzi.jpg", "The outdoor jacuzzi and plunge pool on the garden deck", { portrait: true }),
  clip("gallery/courtyard-walk.mp4", "A walk through the courtyard, past the lounge windows", { portrait: true }),
  photo("gallery/courtyard.jpg", "The courtyard garden opening onto the court"),
  clip("gallery/grounds.mp4", "The court seen from the far baseline", { portrait: true }),
  clip("gallery/courtyard.mp4", "A tree-lined corner of the courtyard", { portrait: true }),
  clip("gallery/entrance-to-court.mp4", "From the entrance through the courtyard onto the court", { portrait: true }),
  clip("gallery/lounge-to-court.mp4", "From the KTV lounge out to the court", { portrait: true }),
  clip("gallery/courtyard-pan.mp4", "Panning across the courtyard between the lounge and the court", { portrait: true }),
];
