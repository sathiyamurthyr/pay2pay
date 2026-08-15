"use client";

import React from "react";

interface ApprovalGuardOverlayProps {
  children: React.ReactNode;
  featureName?: string;
}

export const ApprovalGuardOverlay: React.FC<ApprovalGuardOverlayProps> = ({
  children,
}) => {
  return <>{children}</>;
};
