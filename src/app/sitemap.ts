import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl();
  return ["", "/experience", "/facilities", "/pricing", "/availability", "/book", "/contact"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/availability" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/book" ? 0.9 : 0.7,
  }));
}
