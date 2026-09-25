"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, Receipt, QrCode, UserCircle, Activity
} from "lucide-react";

export const SalesMobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Retailers", href: "/hierarchy/retailers", icon: Store },
    { label: "Transactions", href: "/transactions", icon: Receipt },
    { label: "POS", href: "/pos-machines", icon: QrCode },
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition duration-150 ${
              isActive ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition ${
                isActive ? "bg-indigo-600/20" : ""
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
