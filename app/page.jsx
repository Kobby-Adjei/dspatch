"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const letters = ["D", "S", "P", "A", "T", "C", "H"];

export default function IntroPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/platform");
    }, 3100);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,106,0,.22),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(255,106,0,.10),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.3),transparent_38%,rgba(0,0,0,.55))]" />

      <section className="relative flex flex-col items-center">
        <motion.svg
          width="138"
          height="138"
          viewBox="380 310 290 290"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ y: -180, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 h-[clamp(5rem,12vw,8.5rem)] w-[clamp(5rem,12vw,8.5rem)]"
          aria-label="DSPATCH"
        >
          <defs>
            <linearGradient id="introOrangeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF8A1C" />
              <stop offset="55%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#E95A00" />
            </linearGradient>
            <filter id="introSoftGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#FF6A00" floodOpacity="0.28" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M438 342 H516 C583 342 626 386 626 452 C626 518 583 556 516 556 H514 V506 C514 495 507 488 496 488 H483 L438 545 Z"
            fill="url(#introOrangeGradient)"
            filter="url(#introSoftGlow)"
          />
        </motion.svg>

        <div className="flex items-center justify-center gap-[clamp(.55rem,1.7vw,1.25rem)]">
          {letters.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              initial={{ y: -120, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{
                delay: 0.55 + index * 0.12,
                duration: 0.82,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-[clamp(1.7rem,4.8vw,4rem)] font-semibold leading-none tracking-[0.28em] text-white"
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </section>
    </main>
  );
}
