import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./(dashboard)/retailer/payin/payin.css";
import Providers from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    const forwardedHost = headersList.get("x-forwarded-host") || "";
    const rawHost = headersList.get("host") || "";
    const host = (forwardedHost || rawHost).toLowerCase();
    const port = host.includes(":") ? host.split(":")[1] : "";

    if (host.includes("smspay") || port === "4002") {
      return {
        title: {
          default: "SMSPAY FinTech Retailer Platform",
          template: "%s | SMSPAY",
        },
        description: "Enterprise Merchant Banking & Settlement Terminal - SMSPAY",
        icons: {
          icon: [
            { url: "/branding/smspay-mark.svg", type: "image/svg+xml" },
            { url: "/branding/smspay-favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/branding/smspay-favicon.png", sizes: "32x32", type: "image/png" },
            { url: "/branding/smspay-favicon.ico" },
          ],
          shortcut: "/branding/smspay-mark.svg",
          apple: "/branding/smspay-icon-192.png",
        },
        manifest: "/site.webmanifest",
      };
    }

    if (host.includes("near4you") || port === "4001") {
      return {
        title: {
          default: "Near4You FinTech Retailer Platform",
          template: "%s | Near4You",
        },
        description: "Enterprise Merchant Banking & Settlement Terminal - Near4You",
        icons: {
          icon: [
            { url: "/branding/logo.svg", type: "image/svg+xml" },
            { url: "/branding/near4you-favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/branding/near4you-favicon.png", sizes: "32x32", type: "image/png" },
            { url: "/branding/near4you-favicon.ico" },
          ],
          shortcut: "/branding/near4you-favicon.ico",
          apple: "/branding/icon-192.png",
        },
        manifest: "/site.webmanifest",
      };
    }

    // Default / Pay2Pay (pay2pay.in, port 3000, port 4003, or default)
    return {
      title: {
        default: "Pay2Pay FinTech Retailer Platform",
        template: "%s | Pay2Pay",
      },
      description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
      icons: {
        icon: [
          { url: "/branding/pay2pay-favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/branding/pay2pay-favicon.png", sizes: "32x32", type: "image/png" },
          { url: "/branding/pay2pay-favicon.ico" },
        ],
        shortcut: "/branding/pay2pay-favicon.ico",
        apple: "/branding/pay2pay-icon-192.png",
      },
      manifest: "/site.webmanifest",
    };
  } catch {}

  // Fallback default: Pay2Pay
  return {
    title: {
      default: "Pay2Pay FinTech Retailer Platform",
      template: "%s | Pay2Pay",
    },
    description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
    icons: {
      icon: [
        { url: "/branding/pay2pay-favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/branding/pay2pay-favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/branding/pay2pay-favicon.ico" },
      ],
      shortcut: "/branding/pay2pay-favicon.ico",
      apple: "/branding/pay2pay-icon-192.png",
    },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[var(--text-primary,#0F172A)]" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <script
          id="form-input-sanitizer"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function sanitizeInput(el) {
                  if (!el) return;
                  if (el.tagName === 'FORM') {
                    el.setAttribute('autocomplete', 'off');
                    return;
                  }
                  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    var isPasswordType = el.type === 'password';
                    if (!isPasswordType) {
                      el.setAttribute('autocomplete', 'off');
                      el.setAttribute('autocorrect', 'off');
                      el.setAttribute('autocapitalize', 'off');
                      el.setAttribute('spellcheck', 'false');
                      el.setAttribute('aria-autocomplete', 'none');
                      el.setAttribute('data-lpignore', 'true');
                      el.setAttribute('data-1p-ignore', 'true');
                      el.setAttribute('data-bwignore', 'true');
                      el.setAttribute('data-bitwarden-watching', 'false');
                      
                      var nameOrPlaceholder = (el.name || el.placeholder || el.id || '').toLowerCase();
                      if (nameOrPlaceholder.includes('mobile') || nameOrPlaceholder.includes('phone') || nameOrPlaceholder.includes('aadhaar') || nameOrPlaceholder.includes('account') || nameOrPlaceholder.includes('amount') || nameOrPlaceholder.includes('pincode') || nameOrPlaceholder.includes('pin') || nameOrPlaceholder.includes('otp')) {
                        if (!el.hasAttribute('inputmode')) {
                          el.setAttribute('inputmode', 'numeric');
                        }
                      }
                    }
                  }
                }

                function processAll() {
                  document.querySelectorAll('form').forEach(sanitizeInput);
                  document.querySelectorAll('input, textarea').forEach(sanitizeInput);
                }

                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', processAll);
                } else {
                  processAll();
                }

                document.addEventListener('focusin', function(e) { sanitizeInput(e.target); }, true);
                document.addEventListener('click', function(e) { sanitizeInput(e.target); }, true);
                document.addEventListener('touchstart', function(e) { sanitizeInput(e.target); }, true);

                var observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) {
                        sanitizeInput(node);
                        if (node.querySelectorAll) {
                          node.querySelectorAll('form, input, textarea').forEach(sanitizeInput);
                        }
                      }
                    });
                  });
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
