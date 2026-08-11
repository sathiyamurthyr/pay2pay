import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import TimerIcon from "@mui/icons-material/Timer";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import LockIcon from "@mui/icons-material/Lock";
import SaveIcon from "@mui/icons-material/Save";
import ShieldIcon from "@mui/icons-material/Shield";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";

export const SecuritySettingsView: React.FC = () => {
  const { securitySettings, updateSettings } = useSessionSecurity();

  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(securitySettings.auto_lock_enabled);
  const [idleTimeout, setIdleTimeout] = useState<number>(securitySettings.idle_timeout_minutes);
  const [warningSeconds, setWarningSeconds] = useState<number>(securitySettings.warning_seconds);
  const [lockOnMinimize, setLockOnMinimize] = useState<boolean>(securitySettings.lock_on_minimize);
  const [lockOnSleep, setLockOnSleep] = useState<boolean>(securitySettings.lock_on_sleep);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(securitySettings.biometric_enabled);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings({
      auto_lock_enabled: autoLockEnabled,
      idle_timeout_minutes: idleTimeout,
      warning_seconds: warningSeconds,
      lock_on_minimize: lockOnMinimize,
      lock_on_sleep: lockOnSleep,
      biometric_enabled: biometricEnabled,
    });
    setIsSaving(false);
    setSnackbarOpen(true);
  };

  return (
    <Box
      sx={{
        backgroundColor: "#08111F",
        color: "#F8FAFC",
        minHeight: "100vh",
        p: { xs: 2.5, md: 4 },
        fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 4,
          borderRadius: 3.5,
          backgroundColor: "rgba(15, 23, 42, 0.90)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <SecurityIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px" }}>
              Session Security & Auto-Lock Settings
            </Typography>
            <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.3 }}>
              Configure automatic UI locking, MPIN re-authentication, and biometric settings.
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={<SaveIcon />}
          sx={{
            height: 50,
            borderRadius: "12px",
            px: 3.5,
            fontWeight: 800,
            fontSize: "17px",
            bgcolor: "#2563EB",
            boxShadow: "0 8px 20px rgba(37, 99, 235, 0.4)",
            "&:hover": { bgcolor: "#1D4ED8" },
          }}
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </Paper>

      {/* Main Settings Card Grid */}
      <Grid container spacing={3.5}>
        {/* 1. AUTO LOCK TIMEOUT PANEL */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 4,
              bgcolor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              height: "100%",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
              <TimerIcon sx={{ color: "#60A5FA", fontSize: 26 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
                Auto-Lock & Idle Timeout
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>
                    Enable Auto-Lock
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", mt: 0.2 }}>
                    Automatically lock the screen after period of inactivity.
                  </Typography>
                </Box>
                <Switch
                  checked={autoLockEnabled}
                  onChange={(e) => setAutoLockEnabled(e.target.checked)}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" } }}
                />
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF", mb: 1 }}>
                  Inactivity Timeout Duration
                </Typography>
                <Select
                  fullWidth
                  value={idleTimeout}
                  disabled={!autoLockEnabled}
                  onChange={(e) => setIdleTimeout(Number(e.target.value))}
                  sx={{
                    height: 48,
                    borderRadius: "10px",
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 600,
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  }}
                >
                  <MenuItem value={1}>1 Minute (Default - Enterprise Standard)</MenuItem>
                  <MenuItem value={2}>2 Minutes</MenuItem>
                  <MenuItem value={5}>5 Minutes</MenuItem>
                  <MenuItem value={10}>10 Minutes</MenuItem>
                  <MenuItem value={15}>15 Minutes</MenuItem>
                  <MenuItem value={30}>30 Minutes</MenuItem>
                  <MenuItem value={0}>Never (Requires Admin Permission)</MenuItem>
                </Select>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>
                    30-Second Countdown Warning
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", mt: 0.2 }}>
                    Display animated warning dialog 30 seconds before locking.
                  </Typography>
                </Box>
                <Switch
                  checked={warningSeconds === 30}
                  onChange={(e) => setWarningSeconds(e.target.checked ? 30 : 0)}
                  disabled={!autoLockEnabled}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" } }}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* 2. ADVANCED HARDENING & BIOMETRICS PANEL */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 4,
              bgcolor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              height: "100%",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
              <ShieldIcon sx={{ color: "#60A5FA", fontSize: 26 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
                Advanced Screen Hardening & Biometrics
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>
                    Lock on Browser Minimize / Tab Change
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", mt: 0.2 }}>
                    Immediately lock UI when switching tabs or minimizing browser window.
                  </Typography>
                </Box>
                <Switch
                  checked={lockOnMinimize}
                  onChange={(e) => setLockOnMinimize(e.target.checked)}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" } }}
                />
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>
                    Lock on Laptop / Screen Sleep
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", mt: 0.2 }}>
                    Require MPIN re-authentication when resuming from computer sleep.
                  </Typography>
                </Box>
                <Switch
                  checked={lockOnSleep}
                  onChange={(e) => setLockOnSleep(e.target.checked)}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" } }}
                />
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>
                    Biometric Unlock (Windows Hello / Touch ID)
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", mt: 0.2 }}>
                    Allow unlocking using device fingerprint or face scanner.
                  </Typography>
                </Box>
                <Switch
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" } }}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message="Session security settings saved successfully!"
      />
    </Box>
  );
};
