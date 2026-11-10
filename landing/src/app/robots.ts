import type { MetadataRoute } from 'next';

// Robots directives for voicebox.sh. The AI-crawler blocks below are
// explicit opt-ins for LLM-powered search tools — we WANT them to crawl
// and cite the site, including /llms.txt and /llms-full.txt which are
// specifically authored for them. All claims on the site map to code or
// docs in the repository (see CREDIBILITY.md).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: everything open to any crawler.
      { userAgent: '*', allow: '/' },
      // Named-opt-in for the major LLM crawlers so their licensing /
      // compliance teams can see us explicitly allow citation.
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'Claude-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'Amazonbot', allow: '/' },
      { userAgent: 'DuckDuckBot', allow: '/' },
    ],
    sitemap: 'https://voicebox.sh/sitemap.xml',
    host: 'https://voicebox.sh',
  };
}
