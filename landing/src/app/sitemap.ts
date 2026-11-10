import type { MetadataRoute } from 'next';
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://voicebox.sh';

function listBlogSlugs(): string[] {
  try {
    const dir = path.join(process.cwd(), 'src', 'posts');
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    '',
    'download',
    'pricing',
    'capture',
    'cloud',
    'token',
    'blog',
    'linux-install',
  ].map((slug) => ({
    url: `${SITE}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: slug === '' ? 1.0 : 0.7,
  }));

  const blog = listBlogSlugs().map((slug) => ({
    url: `${SITE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...blog];
}
