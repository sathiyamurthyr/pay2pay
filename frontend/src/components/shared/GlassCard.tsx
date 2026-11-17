import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "summary" | "surface" | "interactive";
  isSelected?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = "default",
  isSelected = false,
  isDisabled = false,
  className = "",
  children,
  ...props
}) => {
  const variantClass =
    variant === "summary"
      ? "card-glass--summary"
      : variant === "surface"
      ? "card-surface"
      : "card-glass";

  const stateClass = isSelected
    ? "card-selected"
    : isDisabled
    ? "card-disabled"
    : variant === "interactive"
    ? "card-interactive"
    : "";

  return (
    <div
      className={`${variantClass} ${stateClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;

