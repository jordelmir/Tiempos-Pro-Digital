import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useAnimationSync } from "../../context/AnimationSyncContext";
import IconTrailSVG from "./IconTrailSVG";
import { ICON_THEMES, IconTheme } from "../../config/iconAnimations";

type Props = {
  children?: React.ReactNode; // svg or icon class (<i>)
  profile?: Partial<{
    animation: "infinite" | "pulse" | "bounce" | "spin3d" | "infiniteTrail";
    speed: number;
    size: number;
    glow: boolean;
    theme: IconTheme;
    trail: boolean;
    enabled: boolean;
  }>;
  className?: string;
  ariaLabel?: string;
};

export default function AnimatedIconUltra({ children, profile = {}, className = "", ariaLabel }: Props) {
  const sync = useAnimationSync();
  
  // Merge default theme (Cyber) with props
  const defaultProfile = ICON_THEMES['cyber'];
  const cfg = { ...defaultProfile, ...profile };
  
  const enabled = sync.enabled && cfg.enabled !== false;
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: false, rootMargin: "100px" });

  // Determine styles by theme
  const themeClass =
    cfg.theme === "neon" ? "icon-glow-neon" : 
    cfg.theme === "cyber" ? "icon-glow-cyber" : 
    cfg.theme === "minimal" ? "icon-glow-minimal" : "";

  // Sync phase for subtle offset to avoid robotic unison
  const phase = sync.masterPhase;

  useEffect(() => {
    if (!enabled || !inView) {
      controls.stop();
      return;
    }

    const speed = cfg.speed ?? 2;
    const anim = cfg.animation ?? "infinite";

    // compute per-icon duration (allow sync phase offset)
    const baseDuration = speed;
    const offset = phase * 0.12; 

    if (anim === "spin3d") {
      // Protocolo de animación fusionada: Rotación Y (Giro) + Escala (Respiración/Vida)
      controls.start({
        rotateY: [0, 180, 360],
        scale: [1, 1.12, 1],
        transition: { 
          duration: baseDuration, 
          repeat: Infinity, 
          ease: "easeInOut", 
          repeatType: "loop", 
          delay: offset 
        },
      });
    } else if (anim === "infinite") {
      controls.start({
        rotate: [0, 360],
        transition: { duration: baseDuration, repeat: Infinity, ease: "linear", repeatType: "loop", delay: offset },
      });
    } else if (anim === "pulse") {
      controls.start({
        scale: [1, 1.15, 1],
        transition: { duration: baseDuration, repeat: Infinity, ease: "easeInOut", delay: offset },
      });
    } else if (anim === "bounce") {
      controls.start({
        y: [0, -6, 0],
        transition: { duration: baseDuration, repeat: Infinity, ease: "easeInOut", delay: offset },
      });
    } else if (anim === "infiniteTrail") {
      controls.start({
        rotate: [0, 360],
        opacity: [0.8, 1, 0.8],
        transition: { duration: baseDuration, repeat: Infinity, ease: "linear", delay: offset },
      });
    }

    return () => {
      controls.stop();
    };
  }, [enabled, inView, cfg.animation, cfg.speed]);

  if (!enabled) return <div ref={ref} className={className}>{children}</div>;

  const content =
    (cfg.trail || cfg.animation === "infiniteTrail") ? (
      <IconTrailSVG trailOn={inView || !!cfg.trail}>{children}</IconTrailSVG>
    ) : (
      children
    );

  return (
    <motion.div
      ref={ref}
      className={`icon-ultra ${themeClass} ${className}`}
      aria-label={ariaLabel}
      animate={controls}
      style={{ 
        scale: cfg.size ?? 1, 
        display: "inline-block",
        perspective: "1000px" // Habilita la profundidad para rotaciones 3D profesionales
      }}
      whileHover={{ 
          rotateY: 15, 
          rotateX: 10, 
          translateY: -5, 
          scale: 1.1,
          transition: { duration: 0.3 } 
      }}
      whileTap={{ scale: 0.9 }}
    >
      {content}
    </motion.div>
  );
}
