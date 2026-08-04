"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Divider,
  Paper,
  Chip,
  Grid,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import EmailIcon from "@mui/icons-material/Email";
import DownloadIcon from "@mui/icons-material/Download";
import { motion } from "framer-motion";

export interface TransactionReceiptProps {
  open: boolean;
  onClose: () => void;
  data: {
    utr: string;
    reference_id: string;
    amount: number;
    amount_in_words: string;
    customer_name: string;
    customer_mobile: string;
    beneficiary_name: string;
    account_number: string;
    bank_name: string;
    ifsc: string;
    service_charge: number;
    gst: number;
    commission: number;
    wallet_before: number;
    wallet_after: number;
    timestamp: string;
  } | null;
}

export const TransactionReceiptDialog: React.FC<TransactionReceiptProps> = ({ open, onClose, data }) => {
  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 4, overflow: "hidden" } } }}>
      <Box sx={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "#FFF", p: 3, textAlign: "center", position: "relative" }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 12, top: 12, color: "#FFF" }}>
          <CloseIcon />
        </IconButton>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: "#4ADE80", mb: 1 }} />
        </motion.div>

        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Payout Successful!
        </Typography>
        <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
          UTR: {data.utr} • Ref: {data.reference_id}
        </Typography>

        <Typography variant="h3" sx={{ fontWeight: 900, color: "#4ADE80", my: 2 }}>
          ₹{data.amount.toLocaleString("en-IN")}
        </Typography>
        <Typography variant="caption" sx={{ color: "#E2E8F0", fontStyle: "italic", fontWeight: 700 }}>
          "{data.amount_in_words}"
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: "#F8FAFC" }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF", mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", display: "block", mb: 1 }}>
            Transaction Details
          </Typography>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Customer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{data.customer_name}</Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }}>+91 {data.customer_mobile}</Typography>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Beneficiary</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{data.beneficiary_name}</Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }}>{data.bank_name} ({data.account_number.slice(-4)})</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF", mb: 3 }}>
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Transfer Amount</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>₹{data.amount.toLocaleString("en-IN")}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Retailer Commission</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A" }}>+₹{data.commission}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Wallet Balance After</Typography>
              <Typography variant="caption" sx={{ fontWeight: 900, color: "#0F172A" }}>₹{data.wallet_after.toLocaleString("en-IN")}</Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Share & Print Actions */}
        <Stack spacing={1.5}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 4 }}>
              <Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                Print
              </Button>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Button fullWidth variant="outlined" startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                WhatsApp
              </Button>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                PDF
              </Button>
            </Grid>
          </Grid>

          <Button fullWidth variant="contained" onClick={onClose} sx={{ py: 1.5, borderRadius: 3, fontWeight: 900, bgcolor: "#0F172A" }}>
            Done / Next Transaction →
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
