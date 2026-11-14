"use client";

import React, { Suspense } from "react";
import BankMeCheckoutPage from "@/app/(dashboard)/retailer/payin/checkout/page";
import { Box, CircularProgress } from "@mui/material";

export default function StandaloneBankMeCheckoutPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] py-8 px-4 flex flex-col justify-center items-center">
      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        }
      >
        <BankMeCheckoutPage />
      </Suspense>
    </main>
  );
}
