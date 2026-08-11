// Shared Domain Components for Pay2Pay Platform

import React from "react";

export interface HeaderBarProps {
  title: string;
  subtitle?: string;
  userName?: string;
  onLogout?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, subtitle, userName, onLogout }) => {
  return React.createElement(
    "header",
    { className: "bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md" },
    React.createElement(
      "div",
      null,
      React.createElement("h1", { className: "text-xl font-bold text-white tracking-tight" }, title),
      subtitle && React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, subtitle)
    ),
    userName && React.createElement(
      "div",
      { className: "flex items-center gap-4" },
      React.createElement("span", { className: "text-sm text-slate-300 font-medium" }, userName),
      onLogout && React.createElement(
        "button",
        {
          onClick: onLogout,
          className: "text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition-colors"
        },
        "Logout"
      )
    )
  );
};
