"use client";

import React, { useEffect, useState, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface CountUpNumberProps {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2.5,
  className = ""
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    `${prefix}0${suffix}`
  );
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      const formatted = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString();
      setDisplayValue(`${prefix}${formatted}${suffix}`);
      return;
    }

    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        const formatted =
          decimals > 0
            ? latest.toFixed(decimals)
            : Math.floor(latest).toLocaleString();
        setDisplayValue(`${prefix}${formatted}${suffix}`);
      }
    });

    return () => controls.stop();
  }, [isInView, target, prefix, suffix, decimals, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};
