"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "@/lib/auth";
import { WalletSyncProvider } from "@/context/WalletSyncProvider";
import { m3Theme } from "@/styles/m3-theme";

export default function Providers({ children }: { children: React.ReactNode }) {
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={m3Theme}>
        <CssBaseline />
        <AuthProvider>
          <WalletSyncProvider>
            {children}
          </WalletSyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
