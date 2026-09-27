import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GALLERY, HOMEPAGE_GALLERY_COUNT } from "@/lib/media";
import { GalleryCarousel } from "@/components/media/gallery-carousel";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";

/** Homepage gallery: a compact sideways carousel; the full set lives on /gallery. */
export function Gallery() {
  if (GALLERY.length === 0) return null;
  return (
    <section className="py-20 md:py-28" id="gallery">
      <div className="container-page flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="Gallery"
          title={
            <>
              Take a look <em>around.</em>
            </>
          }
          intro="The court first, then the KTV lounge, jacuzzi and courtyard you can add. Swipe through, or tap any photo or clip to see it in full."
        />
        <Button asChild variant="outline">
          <Link href="/gallery">
            View all {GALLERY.length} <ArrowRight />
          </Link>
        </Button>
      </div>
      <GalleryCarousel items={GALLERY.slice(0, HOMEPAGE_GALLERY_COUNT)} total={GALLERY.length} moreHref="/gallery" className="mt-10 md:mt-12" />
    </section>
  );
}
