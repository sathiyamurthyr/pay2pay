"use client";

import React, { useState } from "react";
import { ImageIcon } from "lucide-react";

export interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackSrc?: string;
  blurhash?: string;
}

export const BlurImage: React.FC<BlurImageProps> = ({
  src,
  alt,
  className = "",
  imageClassName = "",
  fallbackSrc,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {hasError ? (
        <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-800 text-slate-400 text-xs rounded-lg text-center">
          <ImageIcon className="w-4 h-4 mb-1 text-slate-500 opacity-60" />
          <span className="text-[10px] truncate max-w-full px-1">{alt || "Image"}</span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          onError={() => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              setCurrentSrc(fallbackSrc);
            } else {
              setHasError(true);
            }
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageClassName}`}
          {...props}
        />
      )}
    </div>
  );
};

export default BlurImage;
