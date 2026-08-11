import React from "react";
import { IconButton, Badge } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { tokens } from "@/design-system/tokens/design-tokens";

export const NotificationCenter: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <IconButton sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
    <Badge badgeContent={count} color="error">
      <NotificationsIcon sx={{ fontSize: 22 }} />
    </Badge>
  </IconButton>
);
