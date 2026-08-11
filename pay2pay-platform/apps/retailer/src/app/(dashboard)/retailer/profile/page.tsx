"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Button, Alert, Chip, Divider } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import ShieldIcon from "@mui/icons-material/Shield";
import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function ProfilePage() {
  const { outlet } = useRetailerStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("Security Password & MPIN Updated Successfully!");
  };

  return (
    <Box sx={{ spaceY: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
        <PersonIcon sx={{ color: "#2563EB", fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
            Retailer Outlet Profile & Security
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280" }}>
            Manage outlet credentials, MPIN & active terminal sessions.
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 1 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Merchant Outlet Details</Typography>
          <Stack spacing={2}>
            <M3TextField label="Outlet Code" value={outlet.code} disabled />
            <M3TextField label="Outlet Name" value={outlet.name} disabled />
            <M3TextField label="Owner Name" value={outlet.ownerName} disabled />
            <M3TextField label="Registered Mobile" value={outlet.mobile} disabled />
            <M3TextField label="Registered Location" value={outlet.location} disabled />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Security Credentials & MPIN</Typography>
          {successMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successMsg}</Alert>}
          <form onSubmit={handleUpdateSecurity}>
            <Stack spacing={2.5}>
              <M3TextField label="Current Password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              <M3TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <M3TextField label="Update 4-Digit MPIN for Fast Approvals" type="password" value={mpin} onChange={(e) => setMpin(e.target.value)} />
              <M3Button type="submit" variant="contained" fullWidth>Update Security Settings</M3Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Box>
  );
}
