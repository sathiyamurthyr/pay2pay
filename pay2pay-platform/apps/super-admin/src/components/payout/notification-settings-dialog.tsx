"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  Box,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  IconButton,
  Paper,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VibrationIcon from "@mui/icons-material/Vibration";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import NotificationImportantIcon from "@mui/icons-material/NotificationImportant";

import { notificationEngine, NotificationSettings, NotificationCategory } from "@/services/notification-engine";

interface NotificationSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettingsDialog({ open, onClose }: NotificationSettingsDialogProps) {
  const [settings, setSettings] = useState<NotificationSettings>(notificationEngine.getSettings());

  useEffect(() => {
    if (open) {
      setSettings(notificationEngine.getSettings());
    }
  }, [open]);

  const handleToggleSound = (val: boolean) => {
    const updated = { ...settings, soundEnabled: val };
    setSettings(updated);
    notificationEngine.updateSettings(updated);
  };

  const handleToggleVibration = (val: boolean) => {
    const updated = { ...settings, vibrationEnabled: val };
    setSettings(updated);
    notificationEngine.updateSettings(updated);
  };

  const handleToggleVoice = (val: boolean) => {
    const updated = { ...settings, voiceEnabled: val };
    setSettings(updated);
    notificationEngine.updateSettings(updated);
  };

  const handleToggleCategory = (cat: NotificationCategory, val: boolean) => {
    const updated = {
      ...settings,
      categories: {
        ...settings.categories,
        [cat]: val,
      },
    };
    setSettings(updated);
    notificationEngine.updateSettings(updated);
  };

  const testFeedback = (cat: NotificationCategory) => {
    if (cat === "SUCCESS") notificationEngine.notify("TRANSACTION_SUCCESS");
    if (cat === "INFO") notificationEngine.notify("CUSTOMER_VERIFIED");
    if (cat === "WARNING") notificationEngine.notify("WALLET_LOW");
    if (cat === "ERROR") notificationEngine.notify("TRANSACTION_FAILED");
    if (cat === "CRITICAL") notificationEngine.notify("FRAUD_RISK_ALERT");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4, p: 3, backgroundColor: "#FFFFFF" } } }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: "#EEF2FF", color: "#4F46E5" }}>
            <VolumeUpIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              Notification & Haptic Settings
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              Audio synthesis, mobile vibration, and voice announcement preferences
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "#0F172A" }}>
          Global Feedback Channels
        </Typography>

        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <VolumeUpIcon sx={{ color: "#4F46E5", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Audio Sound Effects (Web Audio Synth)</Typography>
            </Stack>
            <Switch checked={settings.soundEnabled} onChange={(e) => handleToggleSound(e.target.checked)} color="primary" />
          </Stack>

          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <VibrationIcon sx={{ color: "#0284C7", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Mobile Vibration Haptics (Android & iOS)</Typography>
            </Stack>
            <Switch checked={settings.vibrationEnabled} onChange={(e) => handleToggleVibration(e.target.checked)} color="primary" />
          </Stack>

          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <RecordVoiceOverIcon sx={{ color: "#16A34A", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Voice Speech Announcements</Typography>
            </Stack>
            <Switch checked={settings.voiceEnabled} onChange={(e) => handleToggleVoice(e.target.checked)} color="primary" />
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "#0F172A" }}>
        Category Toggles & Live Demo Tests
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {/* SUCCESS */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Success Events</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => testFeedback("SUCCESS")}>
                Test Demo
              </Button>
              <Switch
                checked={settings.categories.SUCCESS}
                onChange={(e) => handleToggleCategory("SUCCESS", e.target.checked)}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* INFO */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <InfoIcon sx={{ color: "#0284C7", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Information Events</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => testFeedback("INFO")}>
                Test Demo
              </Button>
              <Switch
                checked={settings.categories.INFO}
                onChange={(e) => handleToggleCategory("INFO", e.target.checked)}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* WARNING */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <WarningIcon sx={{ color: "#D97706", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Warning Events</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => testFeedback("WARNING")}>
                Test Demo
              </Button>
              <Switch
                checked={settings.categories.WARNING}
                onChange={(e) => handleToggleCategory("WARNING", e.target.checked)}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* ERROR */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <ErrorIcon sx={{ color: "#DC2626", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Error Events</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => testFeedback("ERROR")}>
                Test Demo
              </Button>
              <Switch
                checked={settings.categories.ERROR}
                onChange={(e) => handleToggleCategory("ERROR", e.target.checked)}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* CRITICAL */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <NotificationImportantIcon sx={{ color: "#7C2D12", fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Critical Security Alerts</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button size="small" color="error" startIcon={<PlayArrowIcon />} onClick={() => testFeedback("CRITICAL")}>
                Test Demo
              </Button>
              <Switch
                checked={settings.categories.CRITICAL}
                onChange={(e) => handleToggleCategory("CRITICAL", e.target.checked)}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      <Button variant="contained" fullWidth onClick={onClose} sx={{ py: 1.2, borderRadius: 3 }}>
        Save Preferences & Close
      </Button>
    </Dialog>
  );
}
