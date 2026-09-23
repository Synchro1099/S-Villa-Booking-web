import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "Reserve S-Villa's private villa and courtyard for your group — pickleball, badminton, music room, jacuzzi and bar & lounge. Live availability, easy GCash or bank transfer payment.";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl()),
  title: {
    default: "S-Villa — Private Pickleball & Courtyard",
    template: "%s · S-Villa",
  },
  description,
  applicationName: "S-Villa",
  openGraph: {
    type: "website",
    siteName: "S-Villa Private Pickleball & Courtyard",
    title: "S-Villa — Private Pickleball & Courtyard",
    description,
    locale: "en_PH",
  },
  twitter: { card: "summary_large_image", title: "S-Villa — Private Pickleball & Courtyard", description },
};

export const viewport: Viewport = {
  themeColor: "#1f3329",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
