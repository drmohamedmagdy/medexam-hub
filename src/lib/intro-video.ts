/**
 * Resolves the intro video the auth pages and home hero use, in priority order:
 * 1. NEXT_PUBLIC_INTRO_VIDEO_URL env — supports YouTube watch / youtu.be /
 *    embed / Vimeo URLs. Embedded as an iframe.
 * 2. /demo/hero.mp4 in public/ — embedded as a native <video>. Falls back
 *    to a gradient placeholder if the file 404s.
 *
 * To swap in a real video without redeploying the schema/code, set
 * NEXT_PUBLIC_INTRO_VIDEO_URL to a YouTube URL (e.g. https://youtu.be/abc123).
 */

export type IntroVideo =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "mp4"; src: string; poster?: string };

export function resolveIntroVideo(): IntroVideo {
  const envUrl = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL?.trim();
  if (envUrl) {
    const yt = extractYouTubeId(envUrl);
    if (yt) {
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`,
      };
    }
    const vm = extractVimeoId(envUrl);
    if (vm) {
      return {
        kind: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vm}?title=0&byline=0&portrait=0`,
      };
    }
    // Treat any other URL as a direct MP4 link.
    return { kind: "mp4", src: envUrl };
  }
  return { kind: "mp4", src: "/demo/hero.mp4", poster: "/demo/hero-poster.jpg" };
}

function extractYouTubeId(url: string): string | null {
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
  // youtube.com/shorts/ID, with optional querystring.
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
  );
  return m?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d{5,})/);
  return m?.[1] ?? null;
}
