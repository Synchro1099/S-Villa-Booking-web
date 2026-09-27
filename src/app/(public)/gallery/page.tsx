import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GALLERY, GALLERY_LAYOUT } from "@/lib/media";
import { GalleryGrid } from "@/components/media/gallery-grid";
import { SectionHeading } from "@/components/sections/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos and short clips of S-Villa — the indoor court, the open-air courtyard, the KTV lounge and the jacuzzi.",
};

export default function GalleryPage() {
  return (
    <section className="container-page py-20 md:py-28">
      <SectionHeading
        as="h1"
        eyebrow="Gallery"
        title={
          <>
            Take a look <em>around.</em>
          </>
        }
        intro={`All ${GALLERY.length} photos and clips of the court, the courtyard, the KTV lounge and the jacuzzi. Tap any of them to see it in full.`}
      />
      <GalleryGrid items={GALLERY} layout={GALLERY_LAYOUT} className="mt-12" />
      <Button asChild size="lg" className="mt-14">
        <Link href="/book">
          Book your time <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}
