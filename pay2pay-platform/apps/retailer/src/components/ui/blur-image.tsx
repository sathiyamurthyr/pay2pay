"use client";

import React, { useState, useEffect, memo } from "react";
import { BlurHashCanvas } from "./blurhash-canvas";
import { resolveBlurHash, KNOWN_BLURHASHES } from "@/lib/blurhash";
import { ImageIcon, AlertCircle } from "lucide-react";

export interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  blurhash?: string;
  className?: string;
  imageClassName?: string;
  placeholderClassName?: string;
  aspectRatio?: string;
  showShimmer?: boolean;
  fallbackSrc?: string;
}

export const BlurImage: React.FC<BlurImageProps> = memo(
  ({
    src,
    alt,
    blurhash,
    className = "",
    imageClassName = "",
    placeholderClassName = "",
    aspectRatio,
    showShimmer = true,
    fallbackSrc,
    onLoad,
    onError,
    style,
    ...props
  }) => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);
    const [currentSrc, setCurrentSrc] = useState<string>(src);

    // Resolve accurate BlurHash
    const effectiveBlurHash = blurhash || resolveBlurHash(src, KNOWN_BLURHASHES.DARK_GRADIENT);

    useEffect(() => {
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(src);
    }, [src]);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setIsLoaded(true);
      if (onLoad) onLoad(e as any);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      } else {
        setHasError(true);
      }
      if (onError) onError(e as any);
    };

    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          aspectRatio: aspectRatio || undefined,
          ...style,
        }}
      >
        {/* ── 1. INSTANT BLURHASH BACKGROUND PLACEHOLDER ── */}
        {!isLoaded && !hasError && (
          <div
            className={`absolute inset-0 z-0 overflow-hidden ${placeholderClassName}`}
            aria-hidden="true"
          >
            <BlurHashCanvas blurhash={effectiveBlurHash} width={32} height={32} />
            {/* Shimmer pulse effect */}
            {showShimmer && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer" />
            )}
          </div>
        )}

        {/* ── 2. ERROR FALLBACK STATE ── */}
        {hasError ? (
          <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center p-3 bg-slate-900/60 border border-slate-800 text-slate-400 text-xs rounded-lg text-center">
            <ImageIcon className="w-5 h-5 mb-1 text-slate-500 opacity-60" />
            <span className="text-[10px] truncate max-w-full px-1">{alt || "Image preview"}</span>
          </div>
        ) : (
          /* ── 3. PROGRESSIVE HIGH-RESOLUTION IMAGE ── */
          <img
            src={currentSrc}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`relative z-10 w-full h-full object-cover transition-all duration-700 ease-out ${
              isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-105 blur-md"
            } ${imageClassName}`}
            {...props}
          />
        )}
      </div>
    );
  }
);

BlurImage.displayName = "BlurImage";
export default BlurImage;
