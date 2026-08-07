import { useState } from "react";

export interface BeneficiaryData {
  id: string;
  name: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  isVerified: boolean;
  isFavorite: boolean;
}

export function useBeneficiary() {
  const [beneficiaries] = useState<BeneficiaryData[]>([
    { id: "BEN-01", name: "Suresh Kumar", accountNumber: "91823019283", ifsc: "HDFC0001234", bankName: "HDFC Bank", isVerified: true, isFavorite: true },
    { id: "BEN-02", name: "Anita Devi", accountNumber: "50100239120", ifsc: "ICIC0005678", bankName: "ICICI Bank", isVerified: true, isFavorite: false },
    { id: "BEN-03", name: "Priya Sharma", accountNumber: "30918273645", ifsc: "SBIN0009876", bankName: "State Bank of India", isVerified: true, isFavorite: true },
  ]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryData | null>(beneficiaries[0]);

  return { beneficiaries, selectedBeneficiary, setSelectedBeneficiary };
}
