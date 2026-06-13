/**
 * robots.txt directives (Requirement 8.3).
 *
 * Allows crawling of public content while disallowing the admin console and
 * API surface, and points crawlers to the generated XML sitemap. The base URL
 * honors `NEXT_PUBLIC_SITE_URL` (falling back to the KOORAKIT default) via the
 * shared site helper, so the sitemap reference is always an absolute HTTPS URL.
 */

import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteBaseUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteBaseUrl(),
  };
}
