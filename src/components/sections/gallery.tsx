import { GALLERY, GALLERY_LAYOUT } from "@/lib/media";
import { GalleryGrid } from "@/components/media/gallery-grid";
import { SectionHeading } from "./section-heading";

/** Photo and video gallery. Contents and layout come from src/lib/media.ts. */
export function Gallery() {
  if (GALLERY.length === 0) return null;
  return (
    <section className="container-page py-20 md:py-28" id="gallery">
      <SectionHeading
        eyebrow="Gallery"
        title={
          <>
            Take a look <em>around.</em>
          </>
        }
        intro="The court, the courtyard and the lounge — tap any photo or clip to see it in full."
      />
      <GalleryGrid items={GALLERY} layout={GALLERY_LAYOUT} />
    </section>
  );
}
