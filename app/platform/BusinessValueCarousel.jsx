"use client";

import { useEffect, useState } from "react";

const cards = [
  {
    title: "Save time",
    image: "/operator-carousel/save-time.jpg",
  },
  {
    title: "Hire Detroit talent",
    image: "/operator-carousel/detroit-talent.jpg",
  },
  {
    title: "Enterprise workflows",
    image: "/operator-carousel/workflows.jpg",
  },
  {
    title: "24/7 support layer",
    image: "/operator-carousel/support-layer.jpg",
  },
  {
    title: "Reduce operational costs",
    image: "/operator-carousel/costs.jpg",
  },
  {
    title: "Business operating system",
    image: "/operator-carousel/business-os.jpg",
  },
];

function getOffset(index, active, total) {
  const raw = index - active;
  if (raw > total / 2) return raw - total;
  if (raw < -total / 2) return raw + total;
  return raw;
}

export default function BusinessValueCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % cards.length);
    }, 2300);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="business-value-carousel" aria-label="DSPATCH business value carousel">
      <div className="business-value-carousel-stage">
        {cards.map((card, index) => {
          const offset = getOffset(index, active, cards.length);
          const depth = Math.abs(offset);
          const isActive = offset === 0;

          return (
            <article
              key={card.title}
              className={isActive ? "business-value-card business-value-card-active" : "business-value-card"}
              style={{
                "--x": `${offset * 39}%`,
                "--rotate-y": `${offset * -28}deg`,
                "--translate-z": `${isActive ? 190 : 70 - depth * 26}px`,
                "--scale": `${isActive ? 1.12 : Math.max(0.8, 0.96 - depth * 0.075)}`,
                "--opacity": `${isActive ? 1 : Math.max(0.42, 0.8 - depth * 0.09)}`,
                "--blur": `${isActive ? 0 : Math.min(3.2, depth * 0.95)}px`,
                "--z": cards.length - depth,
                backgroundImage: `url(${card.image})`,
              }}
            >
              <div className="business-value-card-overlay">
                <span />
                <h3>{card.title}</h3>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
