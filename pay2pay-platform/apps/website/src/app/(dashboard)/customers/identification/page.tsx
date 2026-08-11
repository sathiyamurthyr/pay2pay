import React from "react";
import { AadhaarEkycWizard } from "@/components/customers/aadhaar-ekyc-wizard";

export default function CustomerIdentificationPage() {
  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <AadhaarEkycWizard />
    </div>
  );
}
