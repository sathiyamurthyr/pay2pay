"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export const MouseSpotlight: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  const mouseX = useMotionValue(-300);
  const mouseY = useMotionValue(-300);

  // Smooth GPU spring physics
  const springX = useSpring(mouseX, { stiffness: 150, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 25 });

  useEffect(() => {
    // Only enable spotlight on desktop viewports (lg+)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 250); // Offset by half light size (500px / 2)
      mouseY.set(e.clientY - 250);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  if (!isDesktop || shouldReduceMotion) return null;

  return (
    <motion.div
      style={{
        x: springX,
        y: springY
      }}
      className="fixed pointer-events-none z-10 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/12 via-indigo-500/5 to-transparent blur-3xl opacity-80"
    />
  );
};
