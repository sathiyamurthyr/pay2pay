"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Chip,
  Slider,
  Tooltip,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WifiIcon from "@mui/icons-material/Wifi";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import SecurityIcon from "@mui/icons-material/Security";
import SparklesIcon from "@mui/icons-material/AutoAwesome";

import { useRetailerStore } from "@/stores/use-retailer-store";
import { soundSystem } from "@/lib/audio-engine";

export default function NotificationsPage() {
  const router = useRouter();
  const { soundboxEnabled, toggleSoundbox } = useRetailerStore();

  const [selectedLang, setSelectedLang] = useState<"hi" | "en" | "ta" | "te">("hi");
  const [volume, setVolume] = useState<number>(85);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isPlayingTest, setIsPlayingTest] = useState<string | null>(null);

  // Notification Event Triggers
  const [alertDmt, setAlertDmt] = useState<boolean>(true);
  const [alertUpi, setAlertUpi] = useState<boolean>(true);
  const [alertWallet, setAlertWallet] = useState<boolean>(true);
  const [alertLowBal, setAlertLowBal] = useState<boolean>(false);

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/retailer/dashboard");
    }
  };

  const playTestVoice = (lang: "hi" | "en" | "ta" | "te", amount: number = 500) => {
    setIsPlayingTest(lang);
    soundSystem.playSuccessSound(volume);

    let phrase = "";
    switch (lang) {
      case "hi":
        phrase = `Pay2Pay par ${amount} rupaye praapt hue. Transaction safal raha.`;
        break;
      case "ta":
        phrase = `Pay2Pay-il ${amount} roobai pera-pattathu. Vetrikaramaaga mudinthathu.`;
        break;
      case "te":
        phrase = `Pay2Pay lo ${amount} roopayalu andindhi. Transaction vijayavanthamaindhi.`;
        break;
      case "en":
      default:
        phrase = `Received ${amount} Rupees on Pay2Pay. Transaction Successful.`;
        break;
    }

    soundSystem.speakVoice(phrase, lang, speechRate);

    setTimeout(() => {
      setIsPlayingTest(null);
    }, 2800);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 960,
        mx: "auto",
        p: { xs: 2, sm: 3, md: 4 },
        color: "#FFFFFF",
      }}
    >
      {/* ── TOP HEADER WITH BACK & CLOSE OPTION ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          pb: 2,
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            onClick={handleClose}
            sx={{
              borderColor: "rgba(251, 191, 36, 0.35)",
              color: "#FDE047",
              bgcolor: "rgba(251, 191, 36, 0.08)",
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "none",
              borderRadius: "10px",
              px: 1.5,
              py: 0.6,
              "&:hover": {
                borderColor: "#FACC15",
                bgcolor: "rgba(251, 191, 36, 0.18)",
                color: "#FEF08A",
              },
            }}
          >
            Back
          </Button>

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "18px", sm: "22px" },
                letterSpacing: "-0.3px",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Notifications & Soundbox Voice Settings
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12.5px" }}
            >
              Configure real-time voice broadcasting, hardware soundbox, and transaction alerts.
            </Typography>
          </Box>
        </Box>

        {/* PROMINENT CLOSE BUTTON */}
        <Tooltip title="Close Settings & Return">
          <IconButton
            onClick={handleClose}
            aria-label="Close Settings"
            sx={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              bgcolor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              color: "#FDE047",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: "rgba(239, 68, 68, 0.2)",
                borderColor: "#EF4444",
                color: "#F87171",
                transform: "rotate(90deg)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── CARD 1: MASTER SOUNDBOX CONSOLE (GLASSMORPHISM) ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: "20px",
          bgcolor: "rgba(13, 19, 33, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(251, 191, 36, 0.3)",
          boxShadow:
            "0 20px 45px rgba(0, 0, 0, 0.7), 0 0 25px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
          mb: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Gold Sheen Accent Line */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, transparent 0%, #FBBF24 50%, transparent 100%)",
          }}
        />

        <Stack spacing={3}>
          {/* Master Toggle Bar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              p: 2,
              borderRadius: "14px",
              bgcolor: soundboxEnabled ? "rgba(34, 197, 94, 0.08)" : "rgba(255, 255, 255, 0.03)",
              border: soundboxEnabled ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: "14px",
                  bgcolor: soundboxEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  border: soundboxEnabled ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: soundboxEnabled ? "#4ADE80" : "#94A3B8",
                  boxShadow: soundboxEnabled ? "0 0 16px rgba(34, 197, 94, 0.3)" : "none",
                }}
              >
                {soundboxEnabled ? <VolumeUpIcon sx={{ fontSize: 28 }} /> : <VolumeOffIcon sx={{ fontSize: 28 }} />}
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
                    Live Transaction Voice Soundbox
                  </Typography>
                  <Chip
                    label={soundboxEnabled ? "ACTIVE ⚡" : "MUTED"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "10px",
                      fontWeight: 900,
                      bgcolor: soundboxEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)",
                      color: soundboxEnabled ? "#4ADE80" : "#94A3B8",
                      border: soundboxEnabled ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(148, 163, 184, 0.3)",
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12.5px", mt: 0.25 }}>
                  Broadcasts instant high-fidelity audio confirmation immediately after payment completion.
                </Typography>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={soundboxEnabled}
                  onChange={toggleSoundbox}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#4ADE80",
                      "& + .MuiSwitch-track": { backgroundColor: "#22C55E" },
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontWeight: 800, fontSize: "13px", color: soundboxEnabled ? "#4ADE80" : "#94A3B8" }}>
                  {soundboxEnabled ? "Soundbox Enabled" : "Soundbox Muted"}
                </Typography>
              }
            />
          </Box>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* ── SOUNDBOX VOICE TEST SECTION ── */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GraphicEqIcon sx={{ color: "#FBBF24", fontSize: 20 }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    fontSize: "14px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Interactive Soundbox Voice Test
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>
                Simulate live transaction voice broadcast in Indian regional languages
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 1.5,
              }}
            >
              {/* Hindi */}
              <Button
                variant="contained"
                onClick={() => playTestVoice("hi", 500)}
                disabled={isPlayingTest === "hi"}
                startIcon={<PlayArrowIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: isPlayingTest === "hi" ? "rgba(251, 191, 36, 0.3)" : "rgba(251, 191, 36, 0.15)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  color: "#FEF08A",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "none",
                  boxShadow: isPlayingTest === "hi" ? "0 0 15px rgba(251, 191, 36, 0.4)" : "none",
                  "&:hover": {
                    bgcolor: "rgba(251, 191, 36, 0.28)",
                    borderColor: "#FDE047",
                  },
                }}
              >
                हिन्दी (Hindi)
              </Button>

              {/* English */}
              <Button
                variant="contained"
                onClick={() => playTestVoice("en", 500)}
                disabled={isPlayingTest === "en"}
                startIcon={<PlayArrowIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: isPlayingTest === "en" ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  color: "#93C5FD",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "none",
                  boxShadow: isPlayingTest === "en" ? "0 0 15px rgba(59, 130, 246, 0.4)" : "none",
                  "&:hover": {
                    bgcolor: "rgba(59, 130, 246, 0.28)",
                    borderColor: "#60A5FA",
                  },
                }}
              >
                English
              </Button>

              {/* Tamil */}
              <Button
                variant="contained"
                onClick={() => playTestVoice("ta", 500)}
                disabled={isPlayingTest === "ta"}
                startIcon={<PlayArrowIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: isPlayingTest === "ta" ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#86EFAC",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "none",
                  boxShadow: isPlayingTest === "ta" ? "0 0 15px rgba(34, 197, 94, 0.4)" : "none",
                  "&:hover": {
                    bgcolor: "rgba(34, 197, 94, 0.28)",
                    borderColor: "#4ADE80",
                  },
                }}
              >
                தமிழ் (Tamil)
              </Button>

              {/* Telugu */}
              <Button
                variant="contained"
                onClick={() => playTestVoice("te", 500)}
                disabled={isPlayingTest === "te"}
                startIcon={<PlayArrowIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: isPlayingTest === "te" ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  color: "#D8B4FE",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "none",
                  boxShadow: isPlayingTest === "te" ? "0 0 15px rgba(168, 85, 247, 0.4)" : "none",
                  "&:hover": {
                    bgcolor: "rgba(168, 85, 247, 0.28)",
                    borderColor: "#C084FC",
                  },
                }}
              >
                తెలుగు (Telugu)
              </Button>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* ── AUDIO VOLUME & SPEED CONTROLS ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            {/* Volume Control */}
            <Box sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF" }}>
                  Broadcast Volume
                </Typography>
                <Typography sx={{ fontSize: "13px", fontWeight: 900, color: "#FBBF24", fontFamily: "monospace" }}>
                  {volume}%
                </Typography>
              </Box>
              <Slider
                value={volume}
                min={10}
                max={100}
                onChange={(_, val) => setVolume(val as number)}
                sx={{
                  color: "#FBBF24",
                  "& .MuiSlider-thumb": {
                    boxShadow: "0 0 10px rgba(251, 191, 36, 0.6)",
                  },
                }}
              />
            </Box>

            {/* Speech Rate Control */}
            <Box sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF" }}>
                  Voice Announcer Speed
                </Typography>
                <Typography sx={{ fontSize: "13px", fontWeight: 900, color: "#38BDF8", fontFamily: "monospace" }}>
                  {speechRate}x Normal
                </Typography>
              </Box>
              <Slider
                value={speechRate}
                min={0.8}
                max={1.4}
                step={0.1}
                onChange={(_, val) => setSpeechRate(val as number)}
                sx={{
                  color: "#38BDF8",
                  "& .MuiSlider-thumb": {
                    boxShadow: "0 0 10px rgba(56, 189, 248, 0.6)",
                  },
                }}
              />
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* ── CARD 2: EVENT TRIGGERS & HARDWARE TELEMETRY ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        {/* Event Triggers */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "18px",
            bgcolor: "rgba(13, 19, 33, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(251, 191, 36, 0.2)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <NotificationsActiveIcon sx={{ color: "#FBBF24", fontSize: 20 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "14.5px", color: "#FFFFFF" }}>
              Voice Trigger Events
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "13px", color: "#CBD5E1" }}>DMT Money Transfer Success</Typography>
              <Switch checked={alertDmt} onChange={() => setAlertDmt(!alertDmt)} size="small" color="warning" />
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "13px", color: "#CBD5E1" }}>UPI QR Payment Received</Typography>
              <Switch checked={alertUpi} onChange={() => setAlertUpi(!alertUpi)} size="small" color="warning" />
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "13px", color: "#CBD5E1" }}>Wallet Top-Up Approved</Typography>
              <Switch checked={alertWallet} onChange={() => setAlertWallet(!alertWallet)} size="small" color="warning" />
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "13px", color: "#CBD5E1" }}>Low Wallet Balance Warning</Typography>
              <Switch checked={alertLowBal} onChange={() => setAlertLowBal(!alertLowBal)} size="small" color="warning" />
            </Box>
          </Stack>
        </Paper>

        {/* Hardware Status */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "18px",
            bgcolor: "rgba(13, 19, 33, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(251, 191, 36, 0.2)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <SecurityIcon sx={{ color: "#38BDF8", fontSize: 20 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "14.5px", color: "#FFFFFF" }}>
              Soundbox Hardware Telemetry
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "12.5px", color: "#94A3B8" }}>Hardware Model</Typography>
              <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#FFFFFF" }}>Pay2Pay Smart Soundbox Pro</Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <WifiIcon sx={{ fontSize: 16, color: "#4ADE80" }} />
                <Typography sx={{ fontSize: "12.5px", color: "#94A3B8" }}>Network Signal</Typography>
              </Box>
              <Chip label="4G VoLTE Connected" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80" }} />
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <BatteryChargingFullIcon sx={{ fontSize: 16, color: "#FACC15" }} />
                <Typography sx={{ fontSize: "12.5px", color: "#94A3B8" }}>Battery Level</Typography>
              </Box>
              <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#FACC15" }}>98% Charged (AC Powered)</Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "12.5px", color: "#94A3B8" }}>Firmware</Typography>
              <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#38BDF8", fontFamily: "monospace" }}>v4.8.2-SECURE (Up to date)</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* ── BOTTOM ACTIONS: CLOSE BUTTON ── */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CheckCircleIcon />}
          onClick={handleClose}
          sx={{
            py: 1.25,
            px: 4,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#0F172A",
            fontWeight: 900,
            fontSize: "14px",
            boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
            },
          }}
        >
          Save & Return to Dashboard
        </Button>
      </Box>
    </Box>
  );
}
