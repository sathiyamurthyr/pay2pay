import { Variants } from "framer-motion";

/**
 * Enterprise Framer Motion Variants
 * 60 FPS GPU-Accelerated Variants (Transforms & Opacity)
 */

// 1. Page Load Background Fade
export const pageLoadBackgroundVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  }
};

// 2. Logo Scale & Spring
export const logoSpringVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.1
    }
  }
};

// 3. Word Reveal Container
export const wordContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2
    }
  }
};

// 4. Individual Word Reveal
export const wordChildVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] }
  }
};

// 5. Fade Up Subtitle
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.45 }
  }
};

// 6. Stagger Container for Cards & Benefits
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.5
    }
  }
};

// 7. Stagger Card Item
export const staggerCardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

// 8. Infinite Vertical Floating Card Effect (-8px to +8px)
export const floatingCardAnimation = (delay: number = 0) => ({
  y: [-8, 8, -8],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay: delay
  }
});

// 9. AI Fraud Shield Neon Pulse (6 seconds interval)
export const neonPulseVariants: Variants = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(16, 185, 129, 0)",
      "0 0 15px rgba(16, 185, 129, 0.4)",
      "0 0 0px rgba(16, 185, 129, 0)"
    ],
    borderColor: [
      "rgba(16, 185, 129, 0.3)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(16, 185, 129, 0.3)"
    ],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// 10. Shimmer Badge Animation
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// 11. Glass Auth Panel Slide In (Right -> Left)
export const glassPanelVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 22,
      delay: 0.2
    }
  }
};

// 12. Input Validation Error Shake
export const shakeErrorVariants: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 }
  }
};

// 13. Button Hover & Click
export const buttonMotionVariants: Variants = {
  hover: { scale: 1.02, transition: { duration: 0.15, ease: "easeOut" } },
  tap: { scale: 0.98, transition: { duration: 0.1, ease: "easeIn" } }
};

// 14. Floating Particle Trajectory
export const particleVariants = (duration: number, delay: number): Variants => ({
  animate: {
    y: [0, -25, 0],
    x: [0, 12, 0],
    opacity: [0.2, 0.7, 0.2],
    scale: [0.9, 1.1, 0.9],
    transition: {
      duration: duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay
    }
  }
});
