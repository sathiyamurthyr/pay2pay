import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button, Chip } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export interface RecentTransfersProps {
  onRepeatTransfer?: (amount: number) => void;
}

export const RecentTransfers: React.FC<RecentTransfersProps> = ({ onRepeatTransfer }) => {
  const transfers = [
    { id: "TXN-98124012", amount: 25000, bank: "HDFC Bank", status: "SUCCESS", eta: "1.2s", comm: "+₹87.50", time: "13:45" },
    { id: "TXN-98124011", amount: 10000, bank: "ICICI Bank", status: "SUCCESS", eta: "1.5s", comm: "+₹35.00", time: "13:30" },
    { id: "TXN-98124010", amount: 5000, bank: "SBI", status: "SUCCESS", eta: "2.1s", comm: "+₹17.50", time: "13:15" },
    { id: "TXN-98124009", amount: 25000, bank: "Axis Bank", status: "SUCCESS", eta: "1.1s", comm: "+₹87.50", time: "12:50" },
    { id: "TXN-98124008", amount: 15000, bank: "HDFC Bank", status: "SUCCESS", eta: "1.3s", comm: "+₹52.50", time: "12:10" },
  ];

  return (
    <Box sx={{ p: 1, overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "rgba(15, 23, 42, 0.9)", color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", fontWeight: 800 } }}>
            <TableCell>TXN REFERENCE</TableCell>
            <TableCell>AMOUNT</TableCell>
            <TableCell>DESTINATION BANK</TableCell>
            <TableCell>SETTLEMENT ETA</TableCell>
            <TableCell>COMMISSION</TableCell>
            <TableCell>STATUS</TableCell>
            <TableCell align="right">ACTION</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id} sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", py: 1, borderColor: "rgba(255, 255, 255, 0.08)" } }}>
              <TableCell sx={{ fontFamily: "monospace", fontWeight: 700 }}>{t.id}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>₹{t.amount.toLocaleString()}.00</TableCell>
              <TableCell>{t.bank}</TableCell>
              <TableCell sx={{ color: "#60A5FA" }}>{t.eta}</TableCell>
              <TableCell sx={{ color: "#4ADE80", fontWeight: 700 }}>{t.comm}</TableCell>
              <TableCell>
                <Chip icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />} label={t.status} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, fontSize: "10px", height: 20 }} />
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onRepeatTransfer && onRepeatTransfer(t.amount)}
                  startIcon={<RepeatIcon sx={{ fontSize: 14 }} />}
                  sx={{ height: 28, borderRadius: "6px", fontSize: "11px", fontWeight: 700, color: "#60A5FA", borderColor: "rgba(96, 165, 250, 0.4)" }}
                >
                  Repeat
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
