"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, Receipt, QrCode, UserCircle, Activity, ClipboardCheck
} from "lucide-react";

export const SalesMobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Registrations", href: "/registrations", icon: ClipboardCheck },
    { label: "Retailers", href: "/hierarchy/retailers", icon: Store },
    { label: "Transactions", href: "/transactions", icon: Receipt },
    { label: "POS", href: "/pos-machines", icon: QrCode },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-1.5 shadow-xl flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition duration-150 ${
              isActive ? "text-[#94003A] font-bold" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition ${
                isActive ? "bg-[#F8E6EE] text-[#94003A]" : ""
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
