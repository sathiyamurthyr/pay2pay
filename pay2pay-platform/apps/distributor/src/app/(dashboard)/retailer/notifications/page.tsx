"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Button, Switch, FormControlLabel, Divider } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function NotificationsPage() {
  const { soundboxEnabled, toggleSoundbox } = useRetailerStore();

  const playTestAudio = (lang: string) => {
    alert(`Playing Soundbox Voice Alert (${lang.toUpperCase()}): "Pay2Pay par ₹500 praapt hue!"`);
  };

  return (
    <Box sx={{ spaceY: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", mb: 0.5 }}>
        Notifications & Soundbox Voice Settings
      </Typography>
      <Typography variant="body2" sx={{ color: "#6B7280", mb: 3 }}>
        Configure transaction voice notifications and soundbox audio alerts.
      </Typography>

      <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Stack spacing={3}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Live Transaction Soundbox</Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>Broadcast voice alert immediately after successful payment</Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={soundboxEnabled} onChange={toggleSoundbox} color="success" />}
              label={soundboxEnabled ? "Active" : "Muted"}
            />
          </Stack>

          <Divider sx={{ borderColor: "#E5E7EB" }} />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Soundbox Voice Test</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => playTestAudio("hi")}>Test Voice Alert (Hindi)</Button>
              <Button variant="outlined" onClick={() => playTestAudio("en")}>Test Voice Alert (English)</Button>
              <Button variant="outlined" onClick={() => playTestAudio("ta")}>Test Voice Alert (Tamil)</Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
