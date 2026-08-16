"use client";

import React, { useState, useEffect } from "react";
import { Box, Avatar, Typography, Stack, Menu, MenuItem, ListItemIcon, Divider } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SecurityIcon from "@mui/icons-material/Security";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter } from "next/navigation";
import { tokens } from "@/design-system/tokens/design-tokens";
import { useAuth } from "@/lib/auth";
import { retailerApi } from "@/services/retailer-api";

export interface ProfileMenuProps {
  ownerName?: string;
  code?: string;
  photoUrl?: string;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  ownerName = "Retailer Partner",
  code = "RET9182",
  photoUrl,
}) => {
  const router = useRouter();
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dynamicPhoto, setDynamicPhoto] = useState<string | null>(photoUrl || null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (photoUrl) {
      setDynamicPhoto(photoUrl);
      return;
    }
    // Automatically load verified photo URL from profile API
    const loadProfilePhoto = async () => {
      try {
        const res = await retailerApi.getProfile();
        const pUrl = res?.data?.photo?.photo_url;
        if (pUrl) {
          setDynamicPhoto(pUrl);
        }
      } catch {
        // Fallback to name avatar
      }
    };
    loadProfilePhoto();
  }, [photoUrl]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigateProfile = () => {
    handleClose();
    router.push("/retailer/profile");
  };

  const handleNavigateSecurity = () => {
    handleClose();
    router.push("/retailer/security");
  };

  const handleLogoutClick = () => {
    handleClose();
    logout();
  };

  return (
    <>
      <Stack
        direction="row"
        spacing={1.2}
        onClick={handleClick}
        sx={{
          alignItems: "center",
          cursor: "pointer",
          p: 0.8,
          borderRadius: "12px",
          transition: "all 0.2s ease",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.08)",
          },
        }}
      >
        <Avatar
          src={dynamicPhoto || undefined}
          sx={{
            bgcolor: tokens.colors.brand.primary,
            width: 38,
            height: 38,
            fontWeight: 900,
            fontSize: "15px",
            border: "2px solid #3B82F6",
            boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
          }}
        >
          {ownerName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, fontSize: "14px" }}
          >
            {ownerName}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: tokens.colors.status.successText, fontWeight: 700, fontSize: "11px" }}
          >
            ● Active ({code})
          </Typography>
        </Box>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            width: 240,
            bgcolor: "#0F172A",
            color: "#FFFFFF",
            border: `1px solid ${tokens.colors.neutral.dark.border}`,
            borderRadius: "14px",
            overflow: "visible",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            "& .MuiMenuItem-root": {
              px: 2,
              py: 1.2,
              borderRadius: "8px",
              mx: 0.8,
              my: 0.3,
              fontSize: "14px",
              fontWeight: 600,
              color: "#CBD5E1",
              "&:hover": {
                bgcolor: "rgba(59, 130, 246, 0.15)",
                color: "#FFFFFF",
              },
            },
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Avatar
            src={dynamicPhoto || undefined}
            sx={{
              bgcolor: tokens.colors.brand.primary,
              width: 42,
              height: 42,
              fontWeight: 900,
              fontSize: "16px",
              border: "2px solid #3B82F6",
            }}
          >
            {ownerName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF", noWrap: true }}>
              {ownerName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
              Partner: {code}
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />

        <MenuItem onClick={handleNavigateProfile}>
          <ListItemIcon>
            <PersonOutlineIcon sx={{ color: "#3B82F6", fontSize: 20 }} />
          </ListItemIcon>
          My Profile
        </MenuItem>

        <MenuItem onClick={handleNavigateSecurity}>
          <ListItemIcon>
            <SecurityIcon sx={{ color: "#10B981", fontSize: 20 }} />
          </ListItemIcon>
          Security & PIN
        </MenuItem>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />

        <MenuItem
          onClick={handleLogoutClick}
          sx={{
            color: "#EF4444 !important",
            "&:hover": {
              bgcolor: "rgba(239, 68, 68, 0.15) !important",
              color: "#FCA5A5 !important",
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon sx={{ color: "#EF4444", fontSize: 20 }} />
          </ListItemIcon>
          Sign Out / Logout
        </MenuItem>
      </Menu>
    </>
  );
};
