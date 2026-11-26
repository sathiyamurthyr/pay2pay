"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CreditCard,
  Send,
  Wallet,
  ShieldCheck,
  Link2,
  Layout,
  GitBranch,
  FileText,
  LogOut,
  UserCheck,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";
import {
  DemoVendor,
  clearDemoSession,
  fetchMe,
  getDemoToken,
  getStoredVendor,
  resolveDemoPath,
} from "@/lib/inspel-demo-api";

export function ProductIcon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
  switch (name) {
    case "CreditCard":
      return <CreditCard className={className} />;
    case "Send":
      return <Send className={className} />;
    case "Wallet":
      return <Wallet className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "Link2":
      return <Link2 className={className} />;
    case "Layout":
      return <Layout className={className} />;
    case "GitBranch":
      return <GitBranch className={className} />;
    case "FileText":
      return <FileText className={className} />;
    default:
      return <CreditCard className={className} />;
  }
}

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [vendor, setVendor] = useState<DemoVendor | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const cached = getStoredVendor();
    if (cached) setVendor(cached);

    const token = getDemoToken();
    if (token) {
      fetchMe()
        .then((res) => {
          setVendor(res.vendor);
          window.localStorage.setItem("inspel_demo_vendor", JSON.stringify(res.vendor));
        })
        .catch(() => {
          setVendor(null);
        });
    }
  }, [pathname]);

  const handleLogout = () => {
    clearDemoSession();
    setVendor(null);
    router.push(resolveDemoPath("/login"));
  };

  const navItems = [
    { label: "Home", href: resolveDemoPath("/") },
    { label: "Products", href: resolveDemoPath("/catalogue") },
    ...(vendor ? [{ label: "Dashboard", href: resolveDemoPath("/dashboard") }] : []),
    { label: "Contact Us", href: resolveDemoPath("/contact") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFF] text-[#0F172A]">
      {/* Top Navbar matching INSPEL Technologies Solutions Cobalt/Navy style */}
      <header className="sticky top-0 z-40 bg-[#040E2B]/95 backdrop-blur-md border-b border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href={resolveDemoPath("/")} className="flex items-center gap-3 shrink-0">
            <img
              src="/branding/inspel-logo-light.webp"
              alt="INSPEL TECHNOLOGIES SOLUTIONS"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#1A56DB] text-white"
                      : "text-blue-100/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {vendor ? (
              <>
                <Link
                  href={resolveDemoPath("/dashboard")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-blue-100 border border-white/10 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="max-w-[140px] truncate">{vendor.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-red-500/20 hover:text-red-200 text-blue-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href={resolveDemoPath("/login")}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Vendor Login
                </Link>
                <Link
                  href={resolveDemoPath("/register")}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1A56DB] hover:bg-[#1648C8] text-white shadow-sm transition-colors"
                >
                  Register Vendor
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-blue-100 hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#040E2B] px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              {vendor ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-red-200 bg-white/5"
                >
                  Logout ({vendor.name})
                </button>
              ) : (
                <>
                  <Link
                    href={resolveDemoPath("/login")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 text-center"
                  >
                    Vendor Login
                  </Link>
                  <Link
                    href={resolveDemoPath("/register")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#1A56DB] text-white text-center"
                  >
                    Register Vendor
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#040E2B] text-blue-100 border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img
              src="/branding/inspel-logo-light.webp"
              alt="INSPEL TECHNOLOGIES SOLUTIONS"
              className="h-9 w-auto object-contain mb-4"
            />
            <p className="text-sm text-blue-200/80 leading-relaxed">
              INSPEL TECHNOLOGIES SOLUTIONS — Enterprise Payment & Collection Suite powered by official BankMe Pay-in infrastructure.
            </p>
            <p className="mt-3 text-xs text-blue-300/70">CIN: U62010PY2026PTC009663</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Portal Navigation
            </h3>
            <ul className="space-y-2 text-sm text-blue-200/80">
              <li>
                <Link href={resolveDemoPath("/catalogue")} className="hover:text-white transition-colors">
                  Product Catalogue (8 Products)
                </Link>
              </li>
              <li>
                <Link href={resolveDemoPath("/login")} className="hover:text-white transition-colors">
                  Vendor Login
                </Link>
              </li>
              <li>
                <Link href={resolveDemoPath("/register")} className="hover:text-white transition-colors">
                  Vendor Registration
                </Link>
              </li>
              <li>
                <Link href={resolveDemoPath("/dashboard")} className="hover:text-white transition-colors">
                  Vendor Order & Receipt Dashboard
                </Link>
              </li>
              <li>
                <Link href={resolveDemoPath("/contact")} className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Registered Office
            </h3>
            <div className="space-y-2.5 text-sm text-blue-200/80">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
                <span>No. 113 (59), S.V. Patel Salai, Puducherry, 605001, India</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#60A5FA] shrink-0" />
                <a href="mailto:contact@inspeltech.com" className="hover:text-white">
                  contact@inspeltech.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#60A5FA] shrink-0" />
                <a href="tel:+917845578719" className="hover:text-white">
                  +91 7845578719
                </a>
              </p>
              <p className="pt-1">
                <a
                  href="https://inspeltech.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-white"
                >
                  inspeltech.com <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-blue-300/70">
          © {new Date().getFullYear()} INSPEL TECHNOLOGIES SOLUTIONS. All prices displayed in INR with automated 18% GST calculation.
        </div>
      </footer>
    </div>
  );
}
