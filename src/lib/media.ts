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

/** Gallery filter chips on /gallery, in display order ("All" is added automatically). */
export const GALLERY_CATEGORIES = [
  { id: "court", label: "Court" },
  { id: "ktv", label: "KTV Lounge" },
  { id: "pool", label: "Jacuzzi & Pool" },
  { id: "courtyard", label: "Courtyard" },
  { id: "villa", label: "Villa" },
] as const;

export type Category = (typeof GALLERY_CATEGORIES)[number]["id"];

interface MediaBase {
  /** Describes the scene for screen-reader users, e.g. "Lit pickleball court at night". */
  alt: string;
  orientation: Orientation;
  /** CSS object-position used when the frame crops the media. Defaults to "center". */
  focus?: string;
  /** Which /gallery filter chip it appears under. */
  category?: Category;
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
  category?: Category;
}

/** A photo in public/media, e.g. photo("gallery/court.jpg", "…"). */
export function photo(file: string, alt: string, { portrait = false, focus, category }: Options = {}): Photo {
  return { kind: "photo", src: `/media/${file}`, alt, orientation: portrait ? "portrait" : "landscape", focus, category };
}

/** A silent looping clip in public/media, with its poster saved next to it as <name>-poster.jpg. */
export function clip(file: string, alt: string, { portrait = false, focus, category }: Options = {}): Clip {
  return {
    kind: "video",
    src: `/media/${file}`,
    poster: `/media/${file.replace(/\.[a-z0-9]+$/i, "-poster.jpg")}`,
    alt,
    orientation: portrait ? "portrait" : "landscape",
    focus,
    category,
  };
}

export interface HeroSlide {
  media: Media;
  /** Short caption shown with the slide, e.g. "The court" or "Add-on: KTV Lounge". */
  label: string;
}

/**
 * Homepage hero slideshow, first slide first. The first slide loads right away
 * and leads the pitch, so keep the pickleball court there; it also stays up
 * longest (8s, the rest 6s — FIRST_SLIDE_MS / SLIDE_MS in hero.tsx). Use wide
 * landscape shots (3000 px wide or more is ideal). An empty list shows the
 * illustrated court.
 */
export const HERO_SLIDES: HeroSlide[] = [
  // Hero photos are framed in a narrower window than the photo itself (a phone-width strip, or the
  // right-hand column on desktop), so each gets a focus point that keeps its subject in view.
  { media: photo("facilities/pickleball.jpg", "The private indoor pickleball court under bright lights", { focus: "30% 60%" }), label: "The court" },
  { media: photo("gallery/ktv-lounge-wide.jpg", "The KTV lounge with its neon-lit bar, sofas and drum kit"), label: "Add-on: KTV Lounge" },
  { media: photo("facilities/jacuzzi.jpg", "The outdoor jacuzzi and plunge pool on the garden deck", { portrait: true, focus: "50% 62%" }), label: "Add-on: Jacuzzi" },
  { media: photo("gallery/courtyard-dusk.jpg", "The courtyard and lounge windows lit at dusk"), label: "The courtyard" },
];

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
 * How the /gallery grid arranges mixed shapes:
 * - "rows":    portrait tiles take one column, landscape tiles two; every row lines up.
 * - "uniform": identical portrait-ish (4:5) tiles for everything; landscapes crop the most.
 * - "masonry": columns of 4:3 and 3:4 tiles; staggered, Pinterest-style.
 */
export const GALLERY_LAYOUT: "rows" | "uniform" | "masonry" = "rows";

/** How many gallery items the homepage carousel shows before its "View all" card. */
export const HOMEPAGE_GALLERY_COUNT = 12;

/**
 * Gallery, in display order: the homepage carousel shows the first
 * HOMEPAGE_GALLERY_COUNT, /gallery shows everything. Mix photos and clips,
 * landscape and portrait, freely; give each a category for the filter chips.
 * Facility photos can appear here too; the same file serves both.
 */
export const GALLERY: Media[] = [
  photo("facilities/pickleball.jpg", "The indoor pickleball court with its high steel roof and bright lights", { category: "court" }),
  clip("gallery/grounds.mp4", "The court seen from the far baseline", { portrait: true, category: "court" }),
  photo("gallery/ktv-lounge-wide.jpg", "The KTV lounge with its neon-lit bar, sofas and drum kit", { category: "ktv" }),
  photo("facilities/jacuzzi.jpg", "The outdoor jacuzzi and plunge pool on the garden deck", { portrait: true, category: "pool" }),
  clip("gallery/entrance-to-court.mp4", "From the entrance through the courtyard onto the court", { portrait: true, category: "court" }),
  photo("gallery/courtyard-dusk.jpg", "The courtyard and lounge windows lit at dusk", { category: "courtyard" }),
  clip("gallery/bar-lounge.mp4", "The KTV lounge glowing in pink neon", { portrait: true, category: "ktv" }),
  photo("gallery/plunge-pool.jpg", "The plunge pool and stepping-stone garden", { portrait: true, category: "pool" }),
  clip("gallery/pool-night.mp4", "The pool lit blue at night", { portrait: true, category: "pool" }),
  clip("gallery/lounge-to-court.mp4", "From the KTV lounge out to the court", { portrait: true, category: "court" }),
  photo("facilities/ktv-lounge.jpg", "The KTV lounge with its neon-lit bar, big screen and sofas", { category: "ktv" }),
  photo("gallery/ktv-music-corner.jpg", "The KTV lounge's music corner: drum kit and guitar under the neon sign", { category: "ktv" }),
  photo("gallery/dining.jpg", "The dining area and kitchen beside the courtyard", { category: "villa" }),
  clip("gallery/walkthrough.mp4", "Walking through the villa from the entrance", { portrait: true, category: "courtyard" }),
  photo("gallery/courtyard.jpg", "The courtyard garden opening onto the court", { category: "courtyard" }),
  clip("gallery/lounge-to-jacuzzi.mp4", "From the lounge across the deck to the jacuzzi and pool", { portrait: true, category: "pool" }),
  photo("gallery/living-room.jpg", "The living room looking out to the courtyard garden", { category: "villa" }),
  clip("gallery/terrace-dusk.mp4", "The courtyard terrace at dusk", { portrait: true, category: "courtyard" }),
  photo("gallery/balcony.jpg", "The upstairs balcony overlooking the courtyard", { portrait: true, category: "villa" }),
  clip("gallery/courtyard-walk.mp4", "A walk through the courtyard, past the lounge windows", { portrait: true, category: "courtyard" }),
  photo("gallery/pool-exterior.jpg", "The pool and lawn beside the villa", { portrait: true, category: "pool" }),
  clip("gallery/covered-deck.mp4", "The covered deck with lounge chairs", { portrait: true, category: "villa" }),
  clip("gallery/courtyard.mp4", "A tree-lined corner of the courtyard", { portrait: true, category: "courtyard" }),
  clip("gallery/living-to-courtyard.mp4", "From the living and dining area out to the courtyard and pool", { category: "villa" }),
  clip("gallery/courtyard-pan.mp4", "Panning across the courtyard between the lounge and the court", { portrait: true, category: "courtyard" }),
];
