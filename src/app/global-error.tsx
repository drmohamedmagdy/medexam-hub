"use client";

import { useEffect } from "react";

// global-error wraps the root layout itself, so it must define <html>
// and <body>. Triggers when an error is thrown during the layout's own
// render — i.e. when even error.tsx (which lives under the layout) is
// unreachable.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    const route =
      typeof window !== "undefined" ? window.location.pathname : null;
    fetch("/api/errors/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: `[global] ${error.message || "Unknown error"}`,
        stack: error.stack,
        digest: error.digest,
        route,
      }),
      keepalive: true,
    }).catch(() => {});
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          backgroundColor: "#fafafa",
          color: "#111",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 48,
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Something went very wrong
          </h1>
          <p style={{ color: "#555", marginTop: 8 }}>
            The page failed to load. Please try again.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#999",
                marginTop: 8,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: 0,
                padding: "10px 20px",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                border: "1px solid #ccc",
                color: "#111",
                padding: "10px 20px",
                borderRadius: 6,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
