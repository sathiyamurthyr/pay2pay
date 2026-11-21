"use client";

import React from "react";
import { GstReportModule } from "@/modules/reports/GstReportModule";

export default function RetailerGstReportPage() {
  return (
    <GstReportModule
      portalType="retailer"
      title="Retailer Service-Wise GST Statement"
      subtitle="Monthly service-wise GST report and tax invoice downloads for your retailer outlet."
    />
  );
}
