import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface BeneficiaryDataGridProps {
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelect: (ben: BeneficiaryData) => void;
  onOpenDrawer: (ben: BeneficiaryData) => void;
  onToggleFavorite?: (benId: string) => void;
  onDeleteRequest?: (ben: BeneficiaryData) => void;
}

export const BeneficiaryDataGrid: React.FC<BeneficiaryDataGridProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelect,
  onOpenDrawer,
  onToggleFavorite,
  onDeleteRequest,
}) => {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        maxHeight: { xs: 440, md: 540, lg: 620 },
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        overflowY: "auto",
        overflowX: "auto",
        "&::-webkit-scrollbar": { width: "8px", height: "8px" },
        "&::-webkit-scrollbar-track": { background: "rgba(255, 255, 255, 0.04)", borderRadius: "6px" },
        "&::-webkit-scrollbar-thumb": { background: "rgba(96, 165, 250, 0.5)", borderRadius: "6px" },
        "&::-webkit-scrollbar-thumb:hover": { background: "rgba(96, 165, 250, 0.85)" },
      }}
    >
      <Table size="small" stickyHeader sx={{ width: "100%", tableLayout: "fixed" }}>
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                bgcolor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.70)",
                fontWeight: 800,
                fontSize: "12px",
                letterSpacing: "0.05em",
                py: 1.5,
              },
            }}
          >
            <TableCell style={{ width: 44 }} align="center">★</TableCell>
            <TableCell style={{ width: "22%" }}>BENEFICIARY</TableCell>
            <TableCell style={{ width: "14%" }}>RELATIONSHIP</TableCell>
            <TableCell style={{ width: "18%" }}>BANK NAME</TableCell>
            <TableCell style={{ width: "20%" }}>ACCOUNT NUMBER</TableCell>
            <TableCell style={{ width: "12%" }} align="center">VERIFIED</TableCell>
            <TableCell style={{ width: "14%" }}>LAST USED</TableCell>
            <TableCell style={{ width: 90 }} align="center">ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {beneficiaries.map((b) => {
            const isSelected = selectedBeneficiary?.id === b.id;
            const maskedAcc = b.accountNumber || b.maskedAccountNumber || "0630104000156974";

            return (
              <TableRow
                key={b.id}
                onClick={() => onSelect(b)}
                sx={{
                  cursor: "pointer",
                  bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "transparent",
                  boxShadow: isSelected ? "inset 0 0 12px rgba(37, 99, 235, 0.4), 0 4px 16px rgba(37, 99, 235, 0.2)" : "none",
                  transform: isSelected ? "scale(1.01)" : "none",
                  "& td": {
                    borderColor: isSelected ? "rgba(37, 99, 235, 0.5)" : "rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    py: 1.25,
                    fontWeight: isSelected ? 700 : 500,
                  },
                  "&:hover": {
                    bgcolor: isSelected ? "rgba(37, 99, 235, 0.35)" : "rgba(255, 255, 255, 0.04)",
                  },
                  transition: "all 150ms ease",
                }}
              >
                {/* Favorite Toggle Star */}
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleFavorite) onToggleFavorite(b.id);
                    }}
                    sx={{ p: 0.25 }}
                  >
                    {b.isFavorite ? (
                      <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />
                    ) : (
                      <StarBorderIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 18 }} />
                    )}
                  </IconButton>
                </TableCell>

                {/* Beneficiary Name & Code */}
                <TableCell>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px", lineHeight: 1.2 }}>
                      {b.name}
                    </Typography>
                    {b.beneficiaryCode && (
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontFamily: "monospace" }}>
                        {b.beneficiaryCode}
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* Relationship */}
                <TableCell>
                  <Chip
                    label={b.relationship || "Family"}
                    size="small"
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      color: "rgba(255, 255, 255, 0.85)",
                      fontWeight: 600,
                      fontSize: "11px",
                      height: 22,
                    }}
                  />
                </TableCell>

                {/* Bank Name */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 16 }} />
                    <Typography sx={{ fontWeight: 600, color: "#FFFFFF", fontSize: "14px" }}>
                      {b.bankName}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Masked Account Number (Never full raw account number in table) */}
                <TableCell sx={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>
                  {maskedAcc}
                </TableCell>

                {/* Verification Status */}
                <TableCell align="center">
                  <Chip
                    icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
                    label="VERIFIED"
                    size="small"
                    sx={{
                      bgcolor: "rgba(34, 197, 94, 0.15)",
                      color: "#4ADE80",
                      fontWeight: 800,
                      fontSize: "11px",
                      height: 22,
                    }}
                  />
                </TableCell>

                {/* Last Used Timestamp */}
                <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
                  {b.lastUsedAt || "Today"}
                </TableCell>

                {/* Action: Open Right Drawer & Delete */}
                <TableCell align="center">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                    <Tooltip title="View Full Details & History">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDrawer(b);
                        }}
                        sx={{
                          color: "#60A5FA",
                          bgcolor: "rgba(37, 99, 235, 0.15)",
                          "&:hover": { bgcolor: "rgba(37, 99, 235, 0.3)" },
                          p: 0.5,
                        }}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    {onDeleteRequest && (
                      <Tooltip title="Soft-Delete Beneficiary">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(b);
                          }}
                          sx={{
                            color: "#EF4444",
                            bgcolor: "rgba(239, 68, 68, 0.15)",
                            "&:hover": { bgcolor: "rgba(239, 68, 68, 0.3)" },
                            p: 0.5,
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
