import React from "react";
import { Box, Typography, Stack, Button, Chip, Paper } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";

export interface TimelineDockProps {
  currentStep?: number;
  onExecute?: () => void;
  onSaveDraft?: () => void;
  onOpenShortcuts?: () => void;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({
  currentStep = 3,
  onExecute,
  onSaveDraft,
  onOpenShortcuts,
}) => {
  const steps = ["Customer", "Beneficiary", "Amount", "Authenticate", "NPCI", "Settlement", "Receipt"];

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        bottom: 12,
        left: 0,
        right: 0,
        zIndex: 1100,
        p: 1.75,
        px: 3,
        borderRadius: "16px",
        bgcolor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4)",
        width: "100%",
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        {/* Timeline Step Indicators */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <React.Fragment key={step}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  {isCompleted ? (
                    <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                  ) : isCurrent ? (
                    <PlayCircleFilledIcon sx={{ color: "#60A5FA", fontSize: 16 }} />
                  ) : (
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)" }} />
                  )}
                  <Typography
                    sx={{
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? "#60A5FA" : isCompleted ? "#4ADE80" : "rgba(255, 255, 255, 0.4)",
                      fontSize: "12px",
                    }}
                  >
                    {step}
                  </Typography>
                </Stack>
                {idx < steps.length - 1 && (
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "12px", px: 0.5 }}>
                    →
                  </Typography>
                )}
              </React.Fragment>
            );
          })}
        </Stack>

        {/* Action Controls & Shortcuts */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", ml: "auto" }}>
          <Chip
            icon={<KeyboardIcon sx={{ "&&": { color: "#60A5FA", fontSize: 14 } }} />}
            label="Shortcuts (Ctrl+/)"
            size="small"
            onClick={onOpenShortcuts}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.8)",
              fontWeight: 700,
              fontSize: "11px",
              height: 32,
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
            }}
          />

          <Button
            variant="outlined"
            startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            onClick={onSaveDraft}
            sx={{
              height: 36,
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.85)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              bgcolor: "rgba(255, 255, 255, 0.04)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            Draft (Ctrl+S)
          </Button>

          <Button
            variant="contained"
            startIcon={<SendIcon sx={{ fontSize: 16 }} />}
            onClick={onExecute}
            sx={{
              height: 36,
              px: 3,
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 900,
              color: "#FFFFFF",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            EXECUTE TRANSFER (Ctrl+Enter)
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
