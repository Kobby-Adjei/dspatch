"use client";

import { useEffect, useRef, useState } from "react";

export default function LoopingSplineFrame({
  src,
  title,
  className,
  intervalMs = 18000,
  darkMs = 10,
}) {
  const [loopKey, setLoopKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const darkTimerRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIsDark(true);
      setLoopKey((current) => current + 1);
      darkTimerRef.current = window.setTimeout(() => {
        setIsDark(false);
      }, darkMs);
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
      if (darkTimerRef.current) {
        window.clearTimeout(darkTimerRef.current);
      }
    };
  }, [darkMs, intervalMs]);

  return (
    <>
      <iframe
        key={loopKey}
        className={className}
        title={title}
        src={src}
        loading="eager"
        allow="autoplay; fullscreen; xr-spatial-tracking"
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-10 bg-black transition-opacity duration-200 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
