"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export const AnimatedAuroraBackground: React.FC<{ darkMode?: boolean }> = ({ darkMode = true }) => {
  const shouldReduceMotion = useReducedMotion();

  // Floating currency & FinTech symbols data
  const PARTICLES = [
    { symbol: "₹", top: "15%", left: "12%", duration: 7, delay: 0 },
    { symbol: "UPI", top: "45%", left: "80%", duration: 8.5, delay: 1 },
    { symbol: "QR", top: "75%", left: "20%", duration: 6, delay: 0.5 },
    { symbol: "🛡️", top: "25%", left: "70%", duration: 9, delay: 1.5 },
    { symbol: "₹", top: "60%", left: "45%", duration: 7.5, delay: 2 },
    { symbol: "⚡", top: "85%", left: "85%", duration: 6.5, delay: 0.8 },
    { symbol: "•", top: "35%", left: "30%", duration: 5, delay: 0.2 },
    { symbol: "•", top: "65%", left: "65%", duration: 5.5, delay: 1.2 }
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Base Background Gradient */}
      <div className={`absolute inset-0 transition-colors duration-300 ${
        darkMode ? "bg-slate-950" : "bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/50"
      }`} />

      {/* 2. Animated Aurora HSL Blobs */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            animate={{
              x: [0, 60, -40, 0],
              y: [0, -50, 40, 0],
              scale: [1, 1.2, 0.9, 1]
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-32 -left-32 w-[500px] h-[500px] 2xl:w-[700px] 2xl:h-[700px] bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-cyan-500/20 rounded-full blur-[100px]"
          />

          <motion.div
            animate={{
              x: [0, -50, 50, 0],
              y: [0, 60, -30, 0],
              scale: [1, 1.15, 0.95, 1]
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute -bottom-40 -right-32 w-[550px] h-[550px] 2xl:w-[750px] 2xl:h-[750px] bg-gradient-to-tr from-purple-600/25 via-blue-700/20 to-indigo-600/20 rounded-full blur-[120px]"
          />

          <motion.div
            animate={{
              opacity: [0.15, 0.35, 0.15],
              scale: [0.95, 1.1, 0.95]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/3 left-1/3 w-[400px] h-[400px] 2xl:w-[600px] 2xl:h-[600px] bg-gradient-to-br from-cyan-500/15 via-emerald-500/10 to-blue-600/15 rounded-full blur-[90px]"
          />
        </>
      )}

      {/* 3. Soft Moving Light Rays Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-80" />

      {/* 4. Background Animated Line Graph SVG with Telemetry Data Nodes */}
      <div className="absolute top-1/4 left-0 w-full opacity-20 pointer-events-none">
        <svg viewBox="0 0 1000 300" fill="none" stroke="currentColor" className="w-full h-auto text-blue-500">
          <motion.path
            d="M 0,150 Q 150,80 300,160 T 600,120 T 900,180 L 1000,100"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="6 6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />

          {/* Telemetry Dots */}
          {[
            { cx: 300, cy: 160 },
            { cx: 600, cy: 120 },
            { cx: 900, cy: 180 }
          ].map((dot, i) => (
            <g key={i}>
              <circle cx={dot.cx} cy={dot.cy} r="4" fill="#60a5fa" className="fill-blue-400" />
              <motion.circle
                cx={dot.cx}
                cy={dot.cy}
                r="10"
                fill="none"
                stroke="#60a5fa"
                className="stroke-blue-400 stroke-1 fill-none"
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* 5. Floating FinTech Currency Particles */}
      {!shouldReduceMotion &&
        PARTICLES.map((p, idx) => (
          <motion.div
            key={idx}
            style={{ top: p.top, left: p.left }}
            className="absolute text-slate-400/40 text-xs 2xl:text-sm font-mono font-bold tracking-widest pointer-events-none drop-shadow-sm"
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              opacity: [0.2, 0.65, 0.2],
              scale: [0.9, 1.1, 0.9],
              rotate: [0, 10, 0]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay
            }}
          >
            {p.symbol}
          </motion.div>
        ))}

      {/* 6. Subtle Noise Texture Filter Layer */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" fill="none" />
      </svg>
    </div>
  );
};
