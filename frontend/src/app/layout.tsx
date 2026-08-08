import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Pay2Pay FinTech Retailer Platform",
  description: "Enterprise Merchant Banking & Settlement Terminal",
};

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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.addEventListener('focusin', function(e) {
                  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    if (!e.target.hasAttribute('data-autofill-disabled')) {
                      e.target.setAttribute('autocomplete', 'new-password');
                      e.target.setAttribute('autocorrect', 'off');
                      e.target.setAttribute('autocapitalize', 'off');
                      e.target.setAttribute('spellcheck', 'false');
                      e.target.setAttribute('data-lpignore', 'true');
                      e.target.setAttribute('data-1p-ignore', 'true');
                      e.target.setAttribute('data-autofill-disabled', 'true');
                    }
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#111827]" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
