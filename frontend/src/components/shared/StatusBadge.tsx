import React from "react";

export type BadgeVariant = "active" | "recommended" | "disabled" | "live" | "counter" | "scheme";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  pulse = false,
  className = "",
  ...props
}) => {
  const variantClass = `badge-${variant}`;

  return (
    <span className={`badge ${variantClass} ${className}`.trim()} {...props}>
      {pulse && (
        <span
          className="badge-dot badge-dot--pulse"
          style={{
            backgroundColor:
              variant === "active" ? "var(--color-emerald)" : "#FFFFFF",
          }}
        />
      )}
      {children}
    </span>
  );
};

export default StatusBadge;

