import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardIcon from "@mui/icons-material/Keyboard";

export interface KeyboardHelperProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardHelper: React.FC<KeyboardHelperProps> = ({ open, onClose }) => {
  const shortcuts = [
    { key: "F2", action: "Focus Customer Search Input" },
    { key: "F3", action: "Focus Beneficiary Search Input" },
    { key: "F4", action: "Focus Transfer Amount Input" },
    { key: "Ctrl + Enter", action: "Submit & Execute Transfer" },
    { key: "Ctrl + Shift + A", action: "Select & Focus Amount Field" },
    { key: "Ctrl + S", action: "Save Transaction Draft" },
    { key: "Ctrl + /", action: "Toggle Keyboard Shortcuts Helper" },
    { key: "Esc", action: "Cancel / Close Modals & Drawers" },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "16px",
            color: "#FFFFFF",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <KeyboardIcon sx={{ color: "#60A5FA" }} />
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
            Keyboard Shortcuts Helper
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)" }} />

      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={1.5}>
          {shortcuts.map((sc) => (
            <Stack key={sc.key} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "13px", fontWeight: 500 }}>
                {sc.action}
              </Typography>
              <Chip
                label={sc.key}
                size="small"
                sx={{
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: "11px",
                  height: 22,
                  fontFamily: "monospace",
                }}
              />
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
