import React from "react";
import { Box, Avatar, Typography, Stack } from "@mui/material";
import { tokens } from "@/design-system/tokens/design-tokens";

export const ProfileMenu: React.FC<{ ownerName?: string; code?: string }> = ({
  ownerName = "Ramesh Kumar",
  code = "RET9182",
}) => (
  <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", cursor: "pointer" }}>
    <Avatar sx={{ bgcolor: tokens.colors.brand.primary, width: 36, height: 36, fontWeight: 900, fontSize: "14px" }}>
      {ownerName.charAt(0)}
    </Avatar>
    <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary, lineHeight: 1.1 }}>
        {ownerName}
      </Typography>
      <Typography variant="caption" sx={{ color: tokens.colors.status.successText, fontWeight: 700, fontSize: "10px" }}>
        ● Online ({code})
      </Typography>
    </Box>
  </Stack>
);
