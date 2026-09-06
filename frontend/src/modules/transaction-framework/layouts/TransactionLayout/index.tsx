"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ServiceType } from "../../services/TransactionAdapter/types";
import { TransactionWorkspace } from "../../components/TransactionWorkspace";
import { ServiceDownMaintenance } from "@/components/common/ServiceDownMaintenance";

export interface TransactionLayoutProps {
  service: ServiceType;
}

export const TransactionLayout: React.FC<TransactionLayoutProps> = ({ service }) => {
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/services/status", {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const serviceKey = String(service).toUpperCase();
        // Check if service is explicitly enabled/disabled in the live database via Stored Procedure
        if (data.services && typeof data.services[serviceKey] === "boolean") {
          setIsServiceEnabled(data.services[serviceKey]);
        } else if (
          serviceKey.includes("DMT") &&
          data.services &&
          typeof data.services["DMT"] === "boolean"
        ) {
          setIsServiceEnabled(data.services["DMT"]);
        } else {
          setIsServiceEnabled(true);
        }
      } else {
        setIsServiceEnabled((prev) => (prev !== null ? prev : true));
      }
    } catch (e) {
      console.error("Failed to check service status:", e);
      setIsServiceEnabled((prev) => (prev !== null ? prev : true));
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (isLoading && isServiceEnabled === null) {
    return (
      <Box
        sx={{
          width: "100%",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: "#EAB308" }} size={40} />
      </Box>
    );
  }

  // When disabled by Admin in /configuration/services, completely block transactions
  // and render the ServiceDownMaintenance screen with company logo, animation, and language translator
  if (isServiceEnabled === false) {
    return (
      <ServiceDownMaintenance
        service={service}
        onRetry={checkStatus}
      />
    );
  }

  return <TransactionWorkspace service={service} />;
};
