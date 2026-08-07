import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";

export interface AIRouteRecommendationProps {
  amount: number;
}

export const AIRouteRecommendation: React.FC<AIRouteRecommendationProps> = ({ amount }) => {
  const commission = Math.round(amount * 0.0035);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "rgba(37, 99, 235, 0.15)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(37, 99, 235, 0.35)",
        boxShadow: "0 8px 32px rgba(37, 99, 235, 0.25)",
        width: "100%",
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 24 }} />
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
              AI Smart Route Optimization Engine
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px" }}>
              Automated telemetry route selection for maximum settlement speed & earnings
            </Typography>
          </Box>
        </Stack>

        <Chip
          icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />}
          label="RECOMMENDED ROUTE"
          size="small"
          sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 800, fontSize: "11px", height: 24 }}
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
          gap: 1.5,
          pt: 1.5,
          borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
        }}
      >
        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            RECOMMENDED GATEWAY
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
            HDFC IMPS DirectSwitch
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            EXPECTED SUCCESS
          </Typography>
          <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "14px" }}>
            99.94%
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            SETTLEMENT TIME
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>
            12 sec (Instant)
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            EXPECTED COMMISSION
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "14px" }}>
            + ₹{commission > 0 ? commission : 18}.00
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            NETWORK LATENCY
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#38BDF8", fontSize: "14px" }}>
            42ms (Optimal)
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>
            RISK RATING
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#38BDF8", fontSize: "14px" }}>
            LOW (Score 98/100)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};
