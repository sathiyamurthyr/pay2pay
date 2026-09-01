"use client";

import React from "react";

export interface Pay2PayPageHeaderProps {
  eyebrow?: string;
  titlePrefix?: string;
  highlightedTitle?: string;
  titleSuffix?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  highlightColor?: "blue" | "gold" | "emerald" | "primary";
}

export const Pay2PayPageHeader: React.FC<Pay2PayPageHeaderProps> = ({
  eyebrow,
  titlePrefix,
  highlightedTitle,
  titleSuffix,
  title,
  description,
  actions,
  align = "center",
  className = "",
  highlightColor = "blue",
}) => {
  const isCenter = align === "center";

  const getHighlightClass = () => {
    switch (highlightColor) {
      case "gold":
        return "gradient-text-gold";
      case "emerald":
        return "gradient-text-emerald";
      case "primary":
        return "gradient-text-primary";
      case "blue":
      default:
        return "gradient-text-blue";
    }
  };

  return (
    <div
      className={`w-full max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl mx-auto mb-12 sm:mb-16 2xl:mb-20 3xl:mb-24 ${
        isCenter ? "text-center flex flex-col items-center" : "text-left flex flex-col items-start"
      } ${className}`}
    >
      {/* 1. Eyebrow Badge */}
      {eyebrow && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[11px] sm:text-xs 2xl:text-sm font-bold tracking-wider uppercase mb-4 2xl:mb-6 backdrop-blur-md shadow-sm shadow-blue-500/10 select-none">
          <span className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>{eyebrow}</span>
        </div>
      )}

      {/* 2. Main Page / Section Title */}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] 2xl:text-5xl 3xl:text-6xl font-extrabold text-white tracking-tight leading-[1.18] mb-4 2xl:mb-6">
        {title ? (
          title
        ) : (
          <>
            {titlePrefix && <span>{titlePrefix} </span>}
            {highlightedTitle && (
              <span className={getHighlightClass()}>{highlightedTitle}</span>
            )}
            {titleSuffix && <span> {titleSuffix}</span>}
          </>
        )}
      </h2>

      {/* 3. Supporting Description */}
      {description && (
        <p className="text-slate-300 text-sm sm:text-base 2xl:text-lg 3xl:text-xl leading-relaxed max-w-2xl 2xl:max-w-3xl 3xl:max-w-4xl font-normal">
          {description}
        </p>
      )}

      {/* 4. Optional Action Elements */}
      {actions && (
        <div className={`mt-6 flex flex-wrap gap-3 ${isCenter ? "justify-center" : "justify-start"}`}>
          {actions}
        </div>
      )}
    </div>
  );
};
