"use client";

import { useEffect, useState } from "react";

export default function LoopingSplineFrame({
  src,
  title,
  className,
  intervalMs = 18000,
}) {
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoopKey((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return (
    <iframe
      key={loopKey}
      className={className}
      title={title}
      src={src}
      loading="eager"
      allow="autoplay; fullscreen; xr-spatial-tracking"
    />
  );
}
