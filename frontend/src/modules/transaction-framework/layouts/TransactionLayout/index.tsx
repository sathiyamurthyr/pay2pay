import React from "react";
import { ServiceType } from "../../services/TransactionAdapter/types";
import { TransactionWorkspace } from "../../components/TransactionWorkspace";

export interface TransactionLayoutProps {
  service: ServiceType;
}

export const TransactionLayout: React.FC<TransactionLayoutProps> = ({ service }) => {
  return <TransactionWorkspace service={service} />;
};
