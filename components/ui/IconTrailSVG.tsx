'use client'

// components/ui/IconTrailSVG.tsx
'use client'

import React, { useEffect, useRef } from "react";

type IconTrailProps = {
  children?: React.ReactNode; // ideally an inline SVG
  className?: string;
  trailOn?: boolean;
};

export default function IconTrailSVG({ children, className = "", trailOn = false }: IconTrailProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // find paths and set dasharray based on length for the drawing effect
    const paths = el.querySelectorAll("path, circle, line, polyline, polygon");
    paths.forEach((p: any) => {
      try {
        if (p.getTotalLength) {
          const len = p.getTotalLength();
          p.style.strokeDasharray = `${len}`;
          p.style.strokeDashoffset = trailOn ? "0" : `${len}`;
          p.style.transition = "stroke-dashoffset 1.6s linear, opacity 0.4s";
        }
      } catch (e) {
        // some elements might not support getTotalLength
      }
    });
  }, [trailOn]);

  return (
    <div ref={ref} className={`icon-trail ${trailOn ? "trail-on" : ""} ${className}`}>
      {children}
    </div>
  );
}