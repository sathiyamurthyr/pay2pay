"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { WalletSyncProvider } from "@/context/WalletSyncProvider";
import { ContactSupportModalProvider } from "@/context/ContactSupportModalContext";
import { CustomThemeProvider } from "@/context/ThemeContext";
import { SessionSecurityProvider } from "@/context/SessionSecurityProvider";
import { CompanyBrandingProvider } from "@/hooks/useCompanyBranding";

export default function Providers({ children, initialHost = "" }: { children: React.ReactNode; initialHost?: string }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 30, // 30 seconds
          },
        },
      })
  );

  return (
    <CompanyBrandingProvider initialHost={initialHost}>
      <QueryClientProvider client={queryClient}>
        <CustomThemeProvider>
          <AuthProvider>
            <WalletSyncProvider>
              <ContactSupportModalProvider>
                <SessionSecurityProvider>
                  {children}
                </SessionSecurityProvider>
              </ContactSupportModalProvider>
            </WalletSyncProvider>
          </AuthProvider>
        </CustomThemeProvider>
      </QueryClientProvider>
    </CompanyBrandingProvider>
  );
}
