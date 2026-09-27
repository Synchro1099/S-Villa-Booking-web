import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Only site photos in public/media are resized on the fly (see src/lib/media.ts).
    localPatterns: [{ pathname: "/media/**", search: "" }],
    // 75 is the default; the gallery and its lightbox use 85 so photos read crisp.
    qualities: [75, 85],
  },
  experimental: {
    serverActions: {
      // Payment proofs are limited to 5 MB; leave room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
