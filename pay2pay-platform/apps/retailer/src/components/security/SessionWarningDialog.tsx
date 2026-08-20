"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";

export const SessionWarningDialog: React.FC = () => {
  const { sessionState, remainingWarningSeconds, stayActive, lockSession } = useSessionSecurity();

  const isOpen = sessionState === "WARNING";
  const progressPct = ((60 - remainingWarningSeconds) / 60) * 100;

  return (
    <Dialog
      open={isOpen}
      onClose={() => {}}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            bgcolor: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(24px)",
            border: "2px solid #F59E0B",
            boxShadow: "0 24px 64px rgba(245, 158, 11, 0.35)",
            p: 3,
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, textAlign: "center" }}>
        {/* Animated Warning Icon & Timer Ring */}
        <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
          <CircularProgress
            variant="determinate"
            value={progressPct}
            size={96}
            thickness={4.5}
            sx={{ color: "#F59E0B" }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Typography variant="h1" sx={{ fontSize: "36px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
              {remainingWarningSeconds}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#FBBF24", fontWeight: 800, textTransform: "uppercase" }}>
              SEC
            </Typography>
          </Box>
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "20px", mb: 1 }}>
          Inactivity Security Warning
        </Typography>

        <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "14px", lineHeight: 1.6, px: 1, mb: 3 }}>
          For your banking security, your session will close and log out in{" "}
          <strong style={{ color: "#F59E0B" }}>{remainingWarningSeconds} seconds</strong> due to 15 minutes of inactivity.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 0, justifyContent: "center" }}>
        <Stack direction="row" spacing={1.5} sx={{ width: "100%" }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={lockSession}
            startIcon={<LockIcon />}
            sx={{
              height: 44,
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              color: "#F8FAFC",
              borderColor: "rgba(255, 255, 255, 0.25)",
              "&:hover": { borderColor: "#EF4444", color: "#EF4444" },
            }}
          >
            Lock Now
          </Button>

          <Button
            fullWidth
            variant="contained"
            onClick={stayActive}
            startIcon={<CheckCircleIcon />}
            sx={{
              height: 44,
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              },
            }}
          >
            Stay Active
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
