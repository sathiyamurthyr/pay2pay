"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Button } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export default function ReportsPage() {
  const reportsList = [
    { title: "Daily Sales & Commission Summary", desc: "Detailed breakdown of DMT, AEPS, UPI & BBPS margins", format: "PDF / CSV" },
    { title: "Section 194O TDS Certificate", desc: "E-Commerce / FinTech TDS deduction statement for FY 2025-26", format: "PDF" },
    { title: "GSTR-1 B2B & B2C Tax Generator", desc: "Automated GST compliant sales invoice summary for CA filing", format: "Excel (.xlsx)" },
    { title: "Bank Settlement Statement", desc: "List of all wallet-to-bank IMPS transfers and bank UTRs", format: "CSV" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        {reportsList.map((rep) => (
          <Paper key={rep.title} elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <AssessmentIcon sx={{ color: "#2563EB", fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{rep.title}</Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280" }}>Format: {rep.format}</Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ color: "#4B5563" }}>{rep.desc}</Typography>

              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => alert(`Downloading ${rep.title}...`)}
                sx={{ borderRadius: 2.5, fontWeight: 700, borderColor: "#E5E7EB", color: "#374151" }}
              >
                Download Report
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
