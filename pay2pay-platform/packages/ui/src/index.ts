// Shared UI Component Library Exports for Pay2Pay Platform

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = "font-medium transition-all duration-200 rounded-lg inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md focus:ring-indigo-500",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 focus:ring-slate-500",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-300 focus:ring-slate-500",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md focus:ring-rose-500"
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return React.createElement(
    'button',
    {
      className: `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`,
      disabled: disabled || isLoading,
      ...props
    },
    isLoading ? 'Processing...' : children
  );
};

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, className = '' }) => {
  return React.createElement(
    'div',
    { className: `bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl ${className}` },
    title && React.createElement('h3', { className: 'text-lg font-semibold text-white mb-1' }, title),
    subtitle && React.createElement('p', { className: 'text-xs text-slate-400 mb-4' }, subtitle),
    children
  );
};
