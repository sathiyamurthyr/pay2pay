import React from "react";
import { Box, Typography, Stack, Avatar } from "@mui/material";
import { CustomerCard, StatusChip } from "@/design-system/components";
import { CustomerData } from "../../hooks/useCustomer";

export const CustomerPanel: React.FC<{ customer: CustomerData | null }> = ({ customer }) => {
  if (!customer) return null;

  return (
    <CustomerCard
      name={customer.name}
      mobile={customer.mobile}
      status={`LIMIT: ₹${customer.dailyLimitRemaining.toLocaleString()}`}
      kyc={`${customer.kycStatus} eKYC`}
    />
  );
};
