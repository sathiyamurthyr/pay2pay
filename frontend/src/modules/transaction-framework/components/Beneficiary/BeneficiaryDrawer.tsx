import React from "react";
import {
  Drawer,
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { DeleteBeneficiaryDialog } from "@/components/payout/delete-beneficiary-dialog";

export interface BeneficiaryDrawerProps {
  open: boolean;
  beneficiary: BeneficiaryData | null;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
  onSelectForTransfer?: (ben: BeneficiaryData) => void;
  onDelete?: (beneficiaryId: string, reason: string) => Promise<void>;
}

export const BeneficiaryDrawer: React.FC<BeneficiaryDrawerProps> = ({
  open,
  beneficiary,
  onClose,
  onToggleFavorite,
  onSelectForTransfer,
  onDelete,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  if (!beneficiary) return null;

  const dailyUsagePercent = Math.min(100, Math.round(((beneficiary.dailyUsage || 15000) / 50000) * 100));
  const monthlyUsagePercent = Math.min(100, Math.round(((beneficiary.monthlyUsage || 85000) / 200000) * 100));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(4px)", bgcolor: "rgba(0, 0, 0, 0.5)" } },
        paper: {
          sx: {
            width: { xs: "100%", sm: 420 },
            bgcolor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#FFFFFF",
            p: 3,
            boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.5)",
          },
        },
      }}
    >
      <Stack spacing={3} sx={{ height: "100%", justifyContent: "space-between" }}>
        <Box>
          {/* Drawer Header */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 24 }} />
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
                Beneficiary Details
              </Typography>
            </Stack>
            <IconButton onClick={onClose} sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mb: 3 }} />

          {/* Account Profile Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "rgba(37, 99, 235, 0.15)",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              mb: 3,
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
                  {beneficiary.name}
                </Typography>
                <Typography sx={{ color: "#60A5FA", fontSize: "13px", fontWeight: 700, fontFamily: "monospace" }}>
                  {beneficiary.beneficiaryCode || "BEN-0245"}
                </Typography>
              </Box>

              <IconButton
                onClick={() => onToggleFavorite && onToggleFavorite(beneficiary.id)}
                sx={{ color: beneficiary.isFavorite ? "#FFD54F" : "rgba(255, 255, 255, 0.3)" }}
              >
                {beneficiary.isFavorite ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Stack>

            <Chip
              icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />}
              label="BANK VERIFIED · eKYC PASSED"
              size="small"
              sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 800, fontSize: "11px", height: 22 }}
            />
          </Paper>

          {/* Banking Telemetry Grid */}
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 700 }}>
                FULL ACCOUNT NUMBER
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px", fontFamily: "monospace", letterSpacing: "1px" }}>
                {beneficiary.accountNumber}
              </Typography>
            </Box>

            <Stack direction="row" spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 700 }}>
                  IFSC CODE
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px", fontFamily: "monospace" }}>
                  {beneficiary.ifsc}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 700 }}>
                  BANK NAME
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                  {beneficiary.bankName}
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 700 }}>
                BRANCH NAME
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.90)", fontSize: "14px", fontWeight: 600 }}>
                {beneficiary.branchName || "Main Central Branch"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 700 }}>
                PREFERRED GATEWAY
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                <SpeedIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                <Typography sx={{ color: "#4ADE80", fontSize: "14px", fontWeight: 800 }}>
                  {beneficiary.preferredGateway || "HDFC DirectSwitch (1.2s Latency)"}
                </Typography>
              </Stack>
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", my: 1 }} />

            {/* Daily & Monthly Usage Metrics */}
            <Box>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "12px", fontWeight: 600 }}>
                  Daily Usage Limit (₹50,000 Cap)
                </Typography>
                <Typography sx={{ color: "#60A5FA", fontSize: "12px", fontWeight: 800 }}>
                  ₹{(beneficiary.dailyUsage || 15000).toLocaleString()} ({dailyUsagePercent}%)
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={dailyUsagePercent} sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            </Box>

            <Box>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "12px", fontWeight: 600 }}>
                  Monthly Usage Limit (₹2,00,000 Cap)
                </Typography>
                <Typography sx={{ color: "#34D399", fontSize: "12px", fontWeight: 800 }}>
                  ₹{(beneficiary.monthlyUsage || 85000).toLocaleString()} ({monthlyUsagePercent}%)
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={monthlyUsagePercent} color="success" sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            </Box>
          </Stack>
        </Box>

        {/* Drawer Action Controls */}
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            onClick={() => {
              if (onSelectForTransfer) onSelectForTransfer(beneficiary);
              onClose();
            }}
            sx={{
              height: 48,
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 800,
              color: "#FFFFFF",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Select For Transfer
          </Button>

          <Stack direction="row" spacing={1.5}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 40,
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#FFFFFF",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              Edit Details
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 40,
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#EF4444",
                "&:hover": { borderColor: "#EF4444", bgcolor: "rgba(239, 68, 68, 0.1)" },
              }}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {/* Soft Delete Modal */}
      <DeleteBeneficiaryDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        beneficiary={beneficiary}
        onConfirmDelete={async (bId, reason) => {
          if (onDelete) {
            await onDelete(bId, reason);
          }
          setDeleteDialogOpen(false);
          onClose();
        }}
      />
    </Drawer>
  );
};
