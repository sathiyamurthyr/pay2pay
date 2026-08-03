"use client";

import React, { useState } from "react";
import {
  Box, Paper, Typography, Button, TextField, Grid, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, Avatar, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ShieldIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  kycStatus: "VERIFIED" | "PENDING";
  totalTxns: number;
  totalVolume: number;
  lastVisit: string;
  linkedBeneficiaries: number;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: "CUST-1001", name: "Kavitha Sharma", mobile: "+91 98401 92837", kycStatus: "VERIFIED", totalTxns: 24, totalVolume: 85000, lastVisit: "Today, 18:24 PM", linkedBeneficiaries: 3 },
  { id: "CUST-1002", name: "Ramesh Kumar", mobile: "+91 97102 83746", kycStatus: "VERIFIED", totalTxns: 15, totalVolume: 42000, lastVisit: "Today, 18:10 PM", linkedBeneficiaries: 2 },
  { id: "CUST-1003", name: "Suresh Patel", mobile: "+91 94441 02938", kycStatus: "VERIFIED", totalTxns: 32, totalVolume: 120000, lastVisit: "Yesterday", linkedBeneficiaries: 5 },
  { id: "CUST-1004", name: "Meena Sundaram", mobile: "+91 98840 11928", kycStatus: "PENDING", totalTxns: 4, totalVolume: 8500, lastVisit: "3 days ago", linkedBeneficiaries: 1 },
];

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;
    alert(`Customer ${name} (${mobile}) registered successfully!`);
    setAddDialog(false);
    setName("");
    setMobile("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      {/* Search & Action Bar */}
      <Paper elevation={0} sx={{ p: "14px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            fullWidth
            placeholder="Search customer by Name, Mobile Number, or Customer ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
            onClick={() => setAddDialog(true)}
            sx={{ borderRadius: "10px", fontWeight: 700, height: 40, px: 2.5, backgroundColor: "#2563EB", whiteSpace: "nowrap" }}
          >
            Add New Customer
          </Button>
        </Stack>
      </Paper>

      {/* Customer Directory Table */}
      <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Customer ID</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Mobile Number</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>KYC Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Linked Beneficiaries</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Total Volume</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Last Visit</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map((cust) => (
              <TableRow key={cust.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: "#2563EB", width: 36, height: 36, fontWeight: 800, fontSize: "0.85rem" }}>
                      {cust.name.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827" }}>
                      {cust.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace", color: "#2563EB", fontWeight: 700 }}>{cust.id}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{cust.mobile}</TableCell>
                <TableCell>
                  <Chip
                    icon={<ShieldIcon sx={{ "&&": { color: cust.kycStatus === "VERIFIED" ? "#16A34A" : "#D97706", fontSize: 13 } }} />}
                    label={cust.kycStatus}
                    size="small"
                    sx={{
                      backgroundColor: cust.kycStatus === "VERIFIED" ? "#DCFCE7" : "#FEF3C7",
                      color: cust.kycStatus === "VERIFIED" ? "#16A34A" : "#B45309",
                      fontWeight: 800,
                      height: 22,
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{cust.linkedBeneficiaries} Accounts</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₹{cust.totalVolume.toLocaleString("en-IN")}
                </TableCell>
                <TableCell sx={{ color: "#6B7280", fontSize: "13px" }}>{cust.lastVisit}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ReceiptIcon sx={{ fontSize: 14 }} />}
                    sx={{ borderRadius: "8px", fontSize: "12px", fontWeight: 700 }}
                    onClick={() => alert(`Opening 360 profile for ${cust.name}`)}
                  >
                    360 Profile
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Customer Modal */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} slotProps={{ paper: { sx: { borderRadius: "20px", width: 440 } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Register New Customer</DialogTitle>
        <form onSubmit={handleAddCustomer}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Customer Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                size="small"
              />
              <TextField
                fullWidth
                label="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                required
                size="small"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: "10px", fontWeight: 700 }}>
              Register Customer
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
