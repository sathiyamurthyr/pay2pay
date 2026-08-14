"use client";

import React, { useState } from "react";
import { Box, Typography, Paper, Stack, TextField, Button, Alert } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ShieldIcon from "@mui/icons-material/Shield";

export default function RetailerSecurityPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setMessage({ type: "error", text: "Security PIN must be exactly 4 numeric digits" });
      return;
    }
    if (pin !== confirmPin) {
      setMessage({ type: "error", text: "PIN confirmation does not match" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/auth/security/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error("PIN update failed");
      setMessage({ type: "success", text: "Security PIN updated successfully!" });
      setPin("");
      setConfirmPin("");
    } catch {
      setMessage({ type: "error", text: "Failed to update Security PIN. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 3, color: "#F8FAFC" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        <ShieldIcon sx={{ color: "#60A5FA" }} /> Account Security & PIN Settings
      </Typography>

      <Paper sx={{ p: 4, borderRadius: "16px", bgcolor: "rgba(18, 27, 48, 0.85)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#FFFFFF" }}>
          Transaction Security PIN
        </Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", mb: 3 }}>
          Your 4-digit security PIN authorizes high-value transfers and unlocks screen lock sessions.
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3, borderRadius: "10px" }}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleUpdatePin}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="New 4-Digit Security PIN"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              slotProps={{
                htmlInput: { maxLength: 4, inputMode: "numeric" },
                inputLabel: { style: { color: "#94A3B8" } },
                input: { style: { color: "#FFFFFF" } }
              }}
            />

            <TextField
              fullWidth
              label="Confirm New 4-Digit Security PIN"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              slotProps={{
                htmlInput: { maxLength: 4, inputMode: "numeric" },
                inputLabel: { style: { color: "#94A3B8" } },
                input: { style: { color: "#FFFFFF" } }
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading || pin.length !== 4 || pin !== confirmPin}
              startIcon={<LockIcon />}
              sx={{ height: 48, borderRadius: "10px", fontWeight: 800, bgcolor: "#2563EB" }}
            >
              {loading ? "Updating PIN..." : "Update Security PIN"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
