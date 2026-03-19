import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { MetadataRoute } from "next";

const SITE_URL = "https://bnmr.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const postsDir = path.join(process.cwd(), "posts");
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  const postRoutes: MetadataRoute.Sitemap = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
    const { data } = matter(raw);
    return {
      url: `${SITE_URL}/insights/${slug}`,
      lastModified: data.date ? new Date(data.date) : new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    };
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/insights`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/glossary`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...postRoutes,
  ];
}
