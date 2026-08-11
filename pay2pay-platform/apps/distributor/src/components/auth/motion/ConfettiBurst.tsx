"use client";

import React from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

export const ConfettiBurst: React.FC = () => {
  // Generate celebratory particles
  const particles: Particle[] = React.useMemo(() => {
    const colors = [
      "#10B981", // Emerald Green
      "#3B82F6", // Blue
      "#F59E0B", // Amber Gold
      "#8B5CF6", // Purple
      "#06B6D4"  // Cyan
    ];

    return Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.7) * 280,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.8],
            rotate: p.rotation
          }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1]
          }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 2 === 0 ? "50%" : "2px"
          }}
          className="absolute shadow-sm"
        />
      ))}
    </div>
  );
};
