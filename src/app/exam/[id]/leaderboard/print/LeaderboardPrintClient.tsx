"use client";

import { useEffect } from "react";

/**
 * Auto-fires the browser's print dialog after layout settles. The user
 * still has to choose "Save as PDF" — that's how every browser exposes
 * PDF export from a web page without a server-side renderer.
 */
export default function LeaderboardPrintClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(t);
  }, []);
  return <>{children}</>;
}
