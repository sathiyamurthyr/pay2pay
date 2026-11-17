import React from "react";

export type SectionHeaderVariant = "primary" | "teal" | "success";

export interface SectionHeaderProps {
  variant?: SectionHeaderVariant;
  number?: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  variant = "primary",
  number,
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  const variantClass = `section-header--${variant}`;

  return (
    <div className={`section-header ${variantClass} ${className}`.trim()}>
      <div className="section-header__title-group">
        {number && (
          <span className="section-header__number">{number}</span>
        )}
        <div className="section-header__icon-box">
          {icon}
        </div>
        <div className="section-header__text-group">
          <h2 className="section-header__title">{title}</h2>
          {description && (
            <p className="section-header__subtitle">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="section-header__action">{action}</div>}
    </div>
  );
};

export default SectionHeader;

