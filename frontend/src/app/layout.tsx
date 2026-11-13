import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    const host = (headersList.get("host") || "").toLowerCase();

    if (host.includes("pay2pay")) {
      return {
        title: {
          default: "Pay2Pay FinTech Retailer Platform",
          template: "%s | Pay2Pay",
        },
        description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
        icons: {
          icon: [
            { url: "/branding/pay2pay-logo.png", type: "image/png" },
            { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
          ],
          shortcut: "/branding/pay2pay-logo.png",
          apple: "/branding/pay2pay-logo.png",
        },
        manifest: "/site.webmanifest",
      };
    }
  } catch {}

  // Default: Near 4 You
  return {
    title: {
      default: "Near4You FinTech Retailer Platform",
      template: "%s | Near4You",
    },
    description: "Enterprise Merchant Banking & Settlement Terminal - Near 4 You",
    icons: {
      icon: [
        { url: "/branding/logo.svg", type: "image/svg+xml" },
        { url: "/branding/favicon.png", type: "image/png" },
        { url: "/favicon.ico" },
      ],
      shortcut: "/favicon.ico",
      apple: "/branding/logo.svg",
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
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[#292329]" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
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
