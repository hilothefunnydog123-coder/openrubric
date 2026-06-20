import type { MetadataRoute } from "next";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep authed app surfaces out of search results.
      disallow: ["/dashboard/", "/judge/", "/organize", "/organizer/", "/submit", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
