import type { MetadataRoute } from "next";
import { SITE_URL, seoImages } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      images: seoImages.map((img) => img.url),
    },
    {
      url: `${SITE_URL}/resume`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [seoImages[0].url, seoImages[1].url],
    },
  ];
}
