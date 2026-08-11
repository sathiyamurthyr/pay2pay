import React from "react";
import { Box, Typography, Stack, Paper, Table, TableBody, TableCell, TableRow } from "@mui/material";

export interface AuditPanelProps {
  customerCode?: string;
  beneficiaryCode?: string;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  customerCode = "CUS-9812",
  beneficiaryCode = "BEN-CUS-1290-A",
}) => {
  const auditData = [
    { label: "TRANSACTION REFERENCE ID", value: "TXN-98124012-P2P" },
    { label: "CUSTOMER BUSINESS CODE", value: customerCode },
    { label: "BENEFICIARY BUSINESS CODE", value: beneficiaryCode },
    { label: "SESSION SECURITY ID", value: "SESS-8F92A-4414-998A" },
    { label: "CREATED TIMESTAMP", value: "07-Aug-2026 14:20:15.401 UTC" },
    { label: "LAST UPDATED TIMESTAMP", value: "07-Aug-2026 14:20:16.602 UTC" },
    { label: "OPERATOR DEVICE FP", value: "DESKTOP-P2P-WIN11-SECURE" },
    { label: "TERMINAL IP ADDRESS", value: "192.168.1.104 (Authenticated Node)" },
    { label: "AUTHENTICATION SCOPE", value: "RETAILER_DMT_WRITE_OPERATOR" },
  ];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
        <Table size="small">
          <TableBody>
            {auditData.map((item) => (
              <TableRow key={item.label} sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", py: 1, borderColor: "rgba(255, 255, 255, 0.08)" } }}>
                <TableCell sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 700, width: "35%" }}>{item.label}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontFamily: "monospace", color: "#60A5FA" }}>{item.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};
