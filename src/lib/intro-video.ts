import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Resolves which intro video to play on a given page. Each surface
 * (hero / signup / login) has its own env-var override and its own
 * default MP4 file in /public/demo/. If a page-specific source isn't
 * set OR the local file doesn't exist on disk, the resolver falls
 * through to the hero-level source so a single hero.mp4 still works
 * as a global default.
 */

export type IntroVideo =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "mp4"; src: string; poster?: string };

export type IntroSurface = "hero" | "signup" | "login";

export function resolveIntroVideo(surface: IntroSurface = "hero"): IntroVideo {
  const candidates = candidateUrls(surface);
  for (const url of candidates) {
    if (!url) continue;
    const yt = extractYouTubeId(url);
    if (yt) {
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`,
      };
    }
    const vm = extractVimeoId(url);
    if (vm) {
      return {
        kind: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vm}?title=0&byline=0&portrait=0`,
      };
    }
    // External http(s) URL → use as-is. Local /public path → require the
    // file to actually exist before claiming it; otherwise the page would
    // render a broken-media frame.
    if (/^https?:\/\//.test(url)) return { kind: "mp4", src: url };
    if (url.startsWith("/") && publicFileExists(url)) {
      return { kind: "mp4", src: url, poster: posterFor(url) };
    }
  }
  // Final defensive fallback — even hero.mp4 might be missing on a
  // fresh deploy. AuthIntroPanel will show its placeholder if so.
  return { kind: "mp4", src: "/demo/hero.mp4", poster: "/demo/hero-poster.jpg" };
}

function candidateUrls(surface: IntroSurface): (string | undefined)[] {
  const env = (key: string): string | undefined => {
    const v = process.env[key];
    return v && v.trim() ? v.trim() : undefined;
  };

  if (surface === "signup") {
    return [
      env("NEXT_PUBLIC_SIGNUP_VIDEO_URL"),
      "/demo/signup.mp4",
      env("NEXT_PUBLIC_INTRO_VIDEO_URL"),
      "/demo/hero.mp4",
    ];
  }
  if (surface === "login") {
    return [
      env("NEXT_PUBLIC_LOGIN_VIDEO_URL"),
      "/demo/login.mp4",
      env("NEXT_PUBLIC_INTRO_VIDEO_URL"),
      "/demo/hero.mp4",
    ];
  }
  return [env("NEXT_PUBLIC_INTRO_VIDEO_URL"), "/demo/hero.mp4"];
}

function publicFileExists(urlPath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", urlPath));
  } catch {
    return false;
  }
}

function posterFor(urlPath: string): string | undefined {
  const m = urlPath.match(/^(.+)\.(mp4|webm|mov)$/i);
  if (!m) return undefined;
  const candidate = `${m[1]}-poster.jpg`;
  return publicFileExists(candidate) ? candidate : undefined;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
  );
  return m?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d{5,})/);
  return m?.[1] ?? null;
}
