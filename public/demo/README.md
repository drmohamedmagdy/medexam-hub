# Landing-page demo videos

Each surface (home hero / signup / login) can have its own video.
The resolver in `src/lib/intro-video.ts` checks sources in priority
order and falls back gracefully if a file is missing.

## Per-page MP4 files (drop them here)

Save your MP4 with one of these exact filenames in this folder:

| File             | Where it shows                | Falls back to               |
|------------------|-------------------------------|-----------------------------|
| `hero.mp4`       | Home hero "Watch demo" button | (placeholder gradient)      |
| `signup.mp4`     | `/signup` right-hand panel    | `hero.mp4`                  |
| `login.mp4`      | `/login` right-hand panel     | `hero.mp4`                  |
| `exams.mp4`      | "See it in action" — Exams    | (gradient + emoji card)     |
| `research.mp4`   | "See it in action" — Research | (gradient + emoji card)     |
| `statistics.mp4` | "See it in action" — Stats    | (gradient + emoji card)     |
| `library.mp4`    | "See it in action" — Library  | (gradient + emoji card)     |

Optional matching `*-poster.jpg` (e.g. `signup-poster.jpg`) renders
before the video loads on slow connections.

Recommended specs: 6–20s, **muted in source** (the auth pages
autoplay muted, then a "Tap to unmute" button kicks in audio),
under ~5 MB each on mobile-friendly connections.

## Or: point at a hosted URL via env vars

If you don't want to commit MP4s, set any of these in `.env` /
Vercel env vars instead. Accepts YouTube (watch / youtu.be /
shorts / embed), Vimeo, or any direct `.mp4` URL:

```
NEXT_PUBLIC_INTRO_VIDEO_URL=     # global fallback for hero/signup/login
NEXT_PUBLIC_SIGNUP_VIDEO_URL=    # signup-specific (overrides above on /signup)
NEXT_PUBLIC_LOGIN_VIDEO_URL=     # login-specific (overrides above on /login)
```

## Resolution priority

For `/signup`:
1. `NEXT_PUBLIC_SIGNUP_VIDEO_URL`
2. `/public/demo/signup.mp4` if present
3. `NEXT_PUBLIC_INTRO_VIDEO_URL`
4. `/public/demo/hero.mp4`

For `/login`: same chain with `LOGIN` instead of `SIGNUP`.

For the home hero: `NEXT_PUBLIC_INTRO_VIDEO_URL` → `/demo/hero.mp4`.

If all candidates miss, the page shows a clearly-styled "Intro video"
play-button placeholder — never a broken-media frame.
