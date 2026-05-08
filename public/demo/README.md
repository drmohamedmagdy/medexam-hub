# Landing-page demo videos

You have **two options** for the intro video that plays on `/signup`,
`/login`, and the home hero "Watch demo" lightbox.

## Option A — point at a YouTube / Vimeo URL (fastest)

Set this in `.env` (or your Vercel env vars) — no file upload needed:

```
NEXT_PUBLIC_INTRO_VIDEO_URL=https://youtu.be/your-video-id
```

Accepts:
- `https://youtu.be/xxx`
- `https://www.youtube.com/watch?v=xxx`
- `https://www.youtube.com/embed/xxx`
- `https://www.youtube.com/shorts/xxx`
- `https://vimeo.com/123456789`
- Any direct `.mp4` URL

The video appears as an iframe on auth pages and in the hero lightbox.
On the home "See it in action" feature cards, the env override only
applies to the hero/auth panels — the four per-feature cards still
load their own MP4s from this folder (see Option B).

## Option B — drop MP4 / WebM files here

Each clip should be 6–15 seconds, **muted in source** (autoplay
requires it), and ideally < 2 MB.

| File             | Where it shows                | Recommended size            |
|------------------|-------------------------------|-----------------------------|
| `hero.mp4`       | Hero "Watch demo" + auth pages (only when `NEXT_PUBLIC_INTRO_VIDEO_URL` is empty) | 1280×720, 12–20s |
| `hero-poster.jpg`| Poster image for `hero.mp4`   | 1280×720                    |
| `exams.mp4`      | "See it in action" — Exams    | 720×900 (portrait), 6–10s   |
| `research.mp4`   | "See it in action" — Research | 720×900 (portrait), 6–10s   |
| `statistics.mp4` | "See it in action" — Stats    | 720×900 (portrait), 6–10s   |
| `library.mp4`    | "See it in action" — Library  | 720×900 (portrait), 6–10s   |

Optional matching `*-poster.jpg` files render before the video loads
on slow connections.

If a file is missing the page degrades gracefully — the corresponding
spot shows a gradient + emoji + title placeholder. No broken images.
