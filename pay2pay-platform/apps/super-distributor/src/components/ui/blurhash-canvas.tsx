"use client";

import React, { useEffect, useRef, memo } from "react";
import { drawBlurHashToCanvas } from "@/lib/blurhash";

export interface BlurHashCanvasProps {
  blurhash: string;
  width?: number;
  height?: number;
  punch?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const BlurHashCanvas: React.FC<BlurHashCanvasProps> = memo(
  ({
    blurhash,
    width = 32,
    height = 32,
    punch = 1,
    className = "",
    style = {},
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (!canvasRef.current || !blurhash) return;
      drawBlurHashToCanvas(blurhash, canvasRef.current, width, height, punch);
    }, [blurhash, width, height, punch]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full h-full object-cover pointer-events-none transition-opacity duration-700 select-none ${className}`}
        style={{
          imageRendering: "auto",
          transform: "scale(1.05)", // slightly upscale to bleed smooth blur to edges
          filter: "blur(4px)",
          ...style,
        }}
      />
    );
  }
);

BlurHashCanvas.displayName = "BlurHashCanvas";
export default BlurHashCanvas;
