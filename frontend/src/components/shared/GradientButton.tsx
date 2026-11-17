import React from "react";

export interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "pill" | "soundbox";
  children: React.ReactNode;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  ...props
}) => {
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={`${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};

export default GradientButton;

