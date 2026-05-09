"use client";

import { useRef } from "react";
import { incrementCourseViewAction } from "@/app/actions/courses";

export default function VideoPlayer({
  courseId,
  src,
  mimeType,
  poster,
}: {
  courseId: string;
  src: string;
  mimeType: string;
  poster?: string;
}) {
  const counted = useRef(false);

  function onPlay() {
    if (counted.current) return;
    counted.current = true;
    incrementCourseViewAction(courseId).catch(() => {});
  }

  return (
    <video
      controls
      preload="metadata"
      poster={poster}
      onPlay={onPlay}
      className="h-auto w-full"
      playsInline
    >
      <source src={src} type={mimeType} />
      Your browser does not support the video tag.
    </video>
  );
}
