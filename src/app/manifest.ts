import type { MetadataRoute } from "next";

// Web App Manifest — drives the "Install on home screen" flow on Android
// Chrome / Edge / iOS Safari. Tells the browser the brand identity, theme
// colour, start URL, and which icons to use when the user installs.
//
// Test locally: Chrome DevTools → Application → Manifest. Lighthouse PWA
// audit should show "Installable" green.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedExam Hub — AI Medical Exam Prep",
    short_name: "MedExam Hub",
    description:
      "AI-powered medical exam generator + research, study notes, mock exams, and a community for medical students and doctors.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#2563eb",
    lang: "en",
    dir: "auto",
    categories: ["education", "medical", "productivity"],
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.webp",
        sizes: "any",
        type: "image/webp",
        purpose: "any",
      },
    ],
    // Quick links visible when the user long-presses the installed app's
    // home-screen icon (Android Chrome). Keep to the 4 most-used surfaces.
    shortcuts: [
      {
        name: "Generate an exam",
        short_name: "New exam",
        url: "/exam/new",
        description: "Start a new AI-generated exam",
      },
      {
        name: "Mock exam",
        short_name: "Mock",
        url: "/mock",
        description: "Timed full-length mock exam",
      },
      {
        name: "Review due cards",
        short_name: "Review",
        url: "/review",
        description: "Spaced-repetition cards to clear today",
      },
      {
        name: "Plans",
        short_name: "Plans",
        url: "/plans",
        description: "View plans and upgrade",
      },
    ],
  };
}
