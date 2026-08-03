"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Grid, Stack, Button, Dialog, Alert } from "@mui/material";
import ContactsIcon from "@mui/icons-material/Contacts";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import VerifiedIcon from "@mui/icons-material/Verified";
import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { EnterpriseDataGrid, DataGridColumn } from "@/components/ui/enterprise-data-grid";

interface BeneficiaryRecord {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  mobile: string;
  verified: boolean;
}

const MOCK_BENEFICIARIES: BeneficiaryRecord[] = [
  { id: "BEN-101", name: "Kavitha Sharma", accountNumber: "50100998822", bankName: "HDFC Bank", ifsc: "HDFC0000128", mobile: "9876543210", verified: true },
  { id: "BEN-102", name: "Suresh Patel", accountNumber: "30998811223", bankName: "State Bank of India", ifsc: "SBIN0001088", mobile: "9876543210", verified: true },
  { id: "BEN-103", name: "Rajesh Kumar", accountNumber: "001105991823", bankName: "ICICI Bank", ifsc: "ICIC0000011", mobile: "9123456789", verified: true },
];

export default function BeneficiaryPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [mobile, setMobile] = useState("9876543210");
  const [loading, setLoading] = useState(false);
  const [pennyDropSuccess, setPennyDropSuccess] = useState(false);

  const handlePennyDrop = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPennyDropSuccess(true);
    }, 1200);
  };

  const columns: DataGridColumn<BeneficiaryRecord>[] = [
    { id: "name", label: "Beneficiary Name", minWidth: 160, format: (val) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{val}</Typography> },
    { id: "accountNumber", label: "Account Number", minWidth: 160, format: (val) => <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{val}</Typography> },
    { id: "bankName", label: "Bank Name", minWidth: 160 },
    { id: "ifsc", label: "IFSC Code", minWidth: 120, format: (val) => <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{val}</Typography> },
    { id: "verified", label: "Penny Drop Status", align: "center", format: () => <VerifiedIcon sx={{ color: "#16A34A", fontSize: 20 }} /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <M3Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpen(true)}>
          Add New Beneficiary
        </M3Button>
      </Box>

      <EnterpriseDataGrid
        title="Saved Beneficiaries"
        columns={columns}
        rows={MOCK_BENEFICIARIES}
        keyExtractor={(r) => r.id}
        searchPlaceholder="Search by name, bank, account number..."
      />

      {/* Add Beneficiary Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Add & Verify New Beneficiary</Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", mb: 3 }}>Runs instant ₹1 penny-drop validation with bank servers</Typography>

          <Stack spacing={2.5}>
            <M3TextField label="Customer Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <M3TextField label="Account Number" value={account} onChange={(e) => setAccount(e.target.value)} />
            <M3TextField label="IFSC Code" value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="HDFC0000128" />

            <M3Button variant="outlined" loading={loading} onClick={handlePennyDrop}>
              Perform ₹1 Penny Drop Verification
            </M3Button>

            {pennyDropSuccess && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Account Verified! Holder Name: Kavitha Sharma (Bank Matched)
              </Alert>
            )}

            <M3Button variant="contained" disabled={!pennyDropSuccess} onClick={() => setOpen(false)}>
              Save Verified Beneficiary
            </M3Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
