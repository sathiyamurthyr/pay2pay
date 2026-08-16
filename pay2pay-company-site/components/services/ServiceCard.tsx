"use client";

import React from "react";
import { Send, Zap, Smartphone, TrendingUp, Wallet, Users, Check, LucideIcon } from "lucide-react";
import { ServiceItem } from "@/types/site";

const iconMap: Record<string, LucideIcon> = {
  Send,
  Zap,
  Smartphone,
  TrendingUp,
  Wallet,
  Users,
};

interface ServiceCardProps {
  service: ServiceItem;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const IconComponent = iconMap[service.iconName] || Send;

  return (
    <div className="glass-panel p-7 rounded-2xl flex flex-col justify-between group relative overflow-hidden">
      {/* Glow on hover */}
      <div className="absolute -right-10 -top-10 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md shadow-blue-500/10">
            <IconComponent size={22} />
          </div>
          {service.badge && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-slate-300">
              {service.badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-blue-300 transition-colors">
          {service.title}
        </h3>

        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {service.description}
        </p>

        {/* Feature List */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80 mb-6">
          {service.features.map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Check size={10} />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      <a
        href="#contact"
        className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/10 transition-all"
      >
        <span>Partner Inquiry</span>
        <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
      </a>
    </div>
  );
};
