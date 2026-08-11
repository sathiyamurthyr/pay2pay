import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

export const TransactionTimeline: React.FC = () => {
  const steps = [
    { title: "Customer Selected", status: "completed", desc: "Customer mobile & eKYC limits validated" },
    { title: "Beneficiary Selected", status: "completed", desc: "Beneficiary account & IFSC verified" },
    { title: "Amount Entered", status: "completed", desc: "Transfer amount & charges calculated" },
    { title: "Route Selected", status: "completed", desc: "AI engine selected HDFC DirectSwitch (42ms)" },
    { title: "Authentication", status: "active", desc: "Operator biometric / PIN approval pending" },
    { title: "NPCI Switch Processing", status: "pending", desc: "Awaiting NPCI IMPS switch route" },
    { title: "Bank Processing", status: "pending", desc: "Destination bank ledger credit" },
    { title: "Settlement & Receipt", status: "pending", desc: "Final credit confirmation & receipt generation" },
  ];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";

          return (
            <Paper
              key={step.title}
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: "12px",
                bgcolor: isActive ? "rgba(37, 99, 235, 0.2)" : isCompleted ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.03)",
                border: isActive ? "1px solid #3B82F6" : isCompleted ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: isActive ? "0 4px 16px rgba(37, 99, 235, 0.3)" : "none",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                {isCompleted ? (
                  <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                ) : isActive ? (
                  <PlayCircleFilledIcon sx={{ color: "#60A5FA", fontSize: 16 }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 16 }} />
                )}
                <Typography sx={{ fontWeight: 800, color: isActive ? "#60A5FA" : isCompleted ? "#4ADE80" : "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>
                  Step {idx + 1}: {step.title}
                </Typography>
              </Stack>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", lineHeight: 1.3 }}>
                {step.desc}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
};
