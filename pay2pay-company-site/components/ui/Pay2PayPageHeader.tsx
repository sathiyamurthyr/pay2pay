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
}) => {
  const isCenter = align === "center";

  return (
    <div
      className={`w-full max-w-4xl mx-auto mb-12 sm:mb-16 ${
        isCenter ? "text-center flex flex-col items-center" : "text-left flex flex-col items-start"
      } ${className}`}
    >
      {/* 1. Eyebrow Badge */}
      {eyebrow && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-4 backdrop-blur-sm shadow-sm shadow-blue-500/5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>{eyebrow}</span>
        </div>
      )}

      {/* 2. Main Page / Section Title */}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white tracking-tight leading-[1.18] mb-4">
        {title ? (
          title
        ) : (
          <>
            {titlePrefix && <span>{titlePrefix} </span>}
            {highlightedTitle && (
              <span className="gradient-text-gold">{highlightedTitle}</span>
            )}
            {titleSuffix && <span> {titleSuffix}</span>}
          </>
        )}
      </h2>

      {/* 3. Supporting Description */}
      {description && (
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
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
