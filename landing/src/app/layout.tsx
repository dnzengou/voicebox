import type { Metadata } from 'next';
import './globals.css';

const SITE = 'https://voicebox.sh';

// Every claim in the metadata below maps to code or docs in the repository.
// See CREDIBILITY.md at the repo root for the full cross-reference. Do not
// add numerical benchmarks or marketing claims without a source citation.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Voicebox — Open-source local AI voice studio (clone, speak, dictate)',
    template: '%s · Voicebox',
  },
  description:
    'Voicebox is a free, open-source, local-first AI voice studio. Clone voices from short samples, generate speech in 23 languages across 7 TTS engines, dictate into any app with a global hotkey, and give MCP-aware agents (Claude Code, Cursor, Cline) a voice you own. Runs on macOS, Windows, Linux, and Docker — all inference stays on your machine. MIT licensed.',
  applicationName: 'Voicebox',
  category: 'productivity',
  keywords: [
    'voice cloning',
    'text to speech',
    'TTS',
    'speech to text',
    'STT',
    'local AI',
    'open source',
    'Whisper',
    'Qwen3-TTS',
    'Chatterbox',
    'Kokoro',
    'HumeAI TADA',
    'LuxTTS',
    'MCP',
    'Model Context Protocol',
    'MLX',
    'Apple Silicon',
    'CUDA',
    'ROCm',
    'DirectML',
    'Tauri',
    'FastAPI',
    'Claude Code voice',
    'Cursor voice',
    'ElevenLabs alternative',
    'WisprFlow alternative',
    'dictation',
    'voice assistant',
    'agent voice output',
  ],
  authors: [{ name: 'Jamie Pine' }, { name: 'The Voicebox contributors' }],
  creator: 'The Voicebox contributors',
  publisher: 'Voicebox',
  alternates: { canonical: SITE },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Voicebox — Open-source local AI voice studio',
    description:
      'Clone voices locally. Dictate anywhere. Give your AI agents a voice. Free, open-source, MIT. Runs on macOS, Windows, Linux, Docker.',
    type: 'website',
    url: SITE,
    siteName: 'Voicebox',
    images: [{ url: '/og.webp', width: 1200, height: 630, alt: 'Voicebox — open-source AI voice studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voicebox — Open-source local AI voice studio',
    description: 'Clone voices locally. Dictate anywhere. Give your AI agents a voice. Free, MIT, local-first.',
    images: ['/og.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

// JSON-LD structured data: SoftwareApplication plus the Organization that
// publishes it. Consumed by Google rich results, Bing, and LLM-powered
// search tools that scrape structured data to ground their citations.
// Every field below is drawn from the repository (see CREDIBILITY.md).
const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Voicebox',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'macOS, Windows, Linux',
  description:
    'Open-source local-first AI voice studio. Voice cloning, multi-engine text-to-speech, system-wide dictation, and MCP agent voice output — all running on the user\'s own machine.',
  url: SITE,
  downloadUrl: `${SITE}/download`,
  softwareVersion: '0.5.x',
  license: 'https://opensource.org/licenses/MIT',
  author: {
    '@type': 'Organization',
    name: 'The Voicebox contributors',
    url: 'https://github.com/jamiepine/voicebox/graphs/contributors',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Voice cloning from short reference audio',
    'Seven TTS engines (Qwen3-TTS, Qwen CustomVoice, LuxTTS, Chatterbox Multilingual, Chatterbox Turbo, HumeAI TADA, Kokoro)',
    '23 languages',
    'Whisper speech-to-text',
    'Global dictation with configurable chords',
    'Built-in Model Context Protocol (MCP) server',
    'Bundled local Qwen3 LLM for refinement and personas',
    'Stories editor for multi-track voice compositions',
    'Post-processing effects (pitch, reverb, delay, chorus, compression)',
    'Auto-chunking with crossfade for long-form text',
    'Local-first — no cloud account required',
  ],
  keywords: 'voice cloning, TTS, text-to-speech, speech-to-text, Whisper, local AI, open source, MCP, dictation, Tauri, FastAPI',
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Voicebox',
  url: SITE,
  logo: `${SITE}/voicebox-logo.png`,
  sameAs: [
    'https://github.com/jamiepine/voicebox',
  ],
};

// FAQ schema — ground-truth answers that LLM search tools can cite directly.
// Each answer must stay accurate against the live codebase (CREDIBILITY.md).
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Voicebox free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Voicebox is MIT-licensed open-source software. There is no paid tier. The project is maintained by independent contributors.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Voicebox send audio to the cloud?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. All voice cloning, text-to-speech, transcription, and LLM refinement run on the user\'s own machine. There is an optional opt-in cloud sync service for backup and device pairing; disabling it removes all network traffic from the app.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which operating systems does Voicebox run on?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'macOS Apple Silicon (with MLX/Metal acceleration), macOS Intel, Windows (with CUDA or DirectML), Linux (NVIDIA CUDA, AMD ROCm, or Intel Arc XPU), and Docker. CPU-only fallback is available on every platform.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I give Claude Code or Cursor a voice with Voicebox?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Voicebox ships a built-in Model Context Protocol (MCP) server at http://127.0.0.1:17493/mcp. Install it in Claude Code with: claude mcp add voicebox --transport http --url http://127.0.0.1:17493/mcp --header "X-Voicebox-Client-Id: claude-code". For Cursor, Windsurf, or Cline, add the same URL and header to your MCP config. Then bind the client to a voice profile in Voicebox Settings > MCP.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the maximum text length Voicebox can generate?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '500,000 characters per request. Long text is automatically split at sentence boundaries, generated per-chunk, and crossfaded. This is enforced in backend/models.py.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can Voicebox be integrated into my own application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Voicebox exposes a REST API at http://127.0.0.1:17493 and an MCP server at /mcp. The INTEGRATE.md file in the repository provides working recipes for shell scripts, Discord bots, Slack slash commands, Home Assistant, GitHub Actions, OBS, n8n/Zapier, audiobook pipelines, and podcast production.',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="alternate" type="text/plain" title="LLM site map" href="/llms.txt" />
        <link rel="alternate" type="text/plain" title="LLM full reference" href="/llms-full.txt" />
        <script
          type="application/ld+json"
          // Next renders JSON-LD inline; stringify is the standard pattern.
          // See: https://nextjs.org/docs/app/guides/json-ld
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      </head>
      <body>
        <div className="relative min-h-screen bg-background font-sans">{children}</div>
      </body>
    </html>
  );
}
