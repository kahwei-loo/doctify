import type { Variants } from "framer-motion";

// Reduced motion: skip transform/blur, keep fade only
const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const instant = { duration: 0, delay: 0 };

export const blurFadeUp: Variants = {
  hidden: prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 40, filter: "blur(10px)" },
  visible: prefersReducedMotion
    ? { opacity: 1, transition: instant }
    : {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
      },
};

export const staggerContainer: Variants = {
  visible: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12 },
  },
};

export const scaleIn: Variants = {
  hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 },
  visible: prefersReducedMotion
    ? { opacity: 1, transition: instant }
    : {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" },
      },
};

export const slideInFromLeft: Variants = {
  hidden: prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x: -60, filter: "blur(8px)" },
  visible: prefersReducedMotion
    ? { opacity: 1, transition: instant }
    : {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
      },
};

export const scaleReveal: Variants = {
  hidden: prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.8, filter: "blur(12px)" },
  visible: prefersReducedMotion
    ? { opacity: 1, transition: instant }
    : {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      },
};

export const blurFadeDown: Variants = {
  hidden: prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -30, filter: "blur(10px)" },
  visible: prefersReducedMotion
    ? { opacity: 1, transition: instant }
    : {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
      },
};

export const staggerSlow: Variants = {
  visible: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.18 },
  },
};

export const staggerFast: Variants = {
  visible: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
  },
};
