"use client";

import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { MpinSetupCard } from "@/components/customers/mpin-setup-card";

export default function CreatePinPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    }>
      <MpinSetupCard />
    </Suspense>
  );
}
