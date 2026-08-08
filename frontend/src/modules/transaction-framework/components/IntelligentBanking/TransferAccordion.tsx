import React, { useState } from "react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SpeedIcon from "@mui/icons-material/Speed";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TimelineIcon from "@mui/icons-material/Timeline";
import HistoryIcon from "@mui/icons-material/History";
import SecurityIcon from "@mui/icons-material/Security";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { TransferDetails } from "./TransferDetails";
import { AIRouteAnalysis } from "./AIRouteAnalysis";
import { TransferLimits } from "./TransferLimits";
import { ChargesBreakdown } from "./ChargesBreakdown";
import { TransactionTimeline } from "./TransactionTimeline";
import { RecentTransfers } from "./RecentTransfers";
import { RiskAnalysis } from "./RiskAnalysis";
import { OperatorIntelligence } from "./OperatorIntelligence";
import { SmartSuggestions } from "./SmartSuggestions";
import { AuditPanel } from "./AuditPanel";

export interface TransferAccordionProps {
  amount: number;
  charges: number;
  totalPayable: number;
  customerCode?: string;
  beneficiaryCode?: string;
}

export const TransferAccordion: React.FC<TransferAccordionProps> = ({
  amount,
  charges,
  totalPayable,
  customerCode,
  beneficiaryCode,
}) => {
  // Panel 1 expanded by default
  const [expanded, setExpanded] = useState<string | false>("panel1");

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const panels = [
    {
      id: "panel1",
      title: "1. Transfer Details & Telemetry",
      badge: "LIVE DATA",
      badgeColor: "#60A5FA",
      icon: <ReceiptLongIcon sx={{ color: "#60A5FA", fontSize: 20 }} />,
      component: <TransferDetails amount={amount} charges={charges} totalPayable={totalPayable} />,
    },
    {
      id: "panel2",
      title: "2. AI Route Selection & Network Health",
      badge: "OPTIMIZED",
      badgeColor: "#4ADE80",
      icon: <AutoAwesomeIcon sx={{ color: "#4ADE80", fontSize: 20 }} />,
      component: <AIRouteAnalysis />,
    },
    {
      id: "panel3",
      title: "3. Customer & Operator Transfer Limits",
      badge: "VERIFIED",
      badgeColor: "#34D399",
      icon: <SpeedIcon sx={{ color: "#34D399", fontSize: 20 }} />,
      component: <TransferLimits dailyRemaining={25000} monthlyRemaining={200000} walletBalance={useRetailerStore.getState().wallet.mainBalance} />,
    },
    {
      id: "panel4",
      title: "4. Charges, Fees & Retailer Margin Breakdown",
      badge: "+₹87.50 MARGIN",
      badgeColor: "#4ADE80",
      icon: <AccountBalanceIcon sx={{ color: "#4ADE80", fontSize: 20 }} />,
      component: <ChargesBreakdown amount={amount} charges={charges} />,
    },
    {
      id: "panel5",
      title: "5. Live Step-by-Step Transaction Timeline",
      badge: "STEP 5 OF 8",
      badgeColor: "#38BDF8",
      icon: <TimelineIcon sx={{ color: "#38BDF8", fontSize: 20 }} />,
      component: <TransactionTimeline />,
    },
    {
      id: "panel6",
      title: "6. Recent Customer Transfers & Quick Repeat",
      badge: "LAST 10",
      badgeColor: "#60A5FA",
      icon: <HistoryIcon sx={{ color: "#60A5FA", fontSize: 20 }} />,
      component: <RecentTransfers />,
    },
    {
      id: "panel7",
      title: "7. Fraud Risk & Device Confidence Analysis",
      badge: "ULTRA LOW RISK",
      badgeColor: "#4ADE80",
      icon: <SecurityIcon sx={{ color: "#4ADE80", fontSize: 20 }} />,
      component: <RiskAnalysis />,
    },
    {
      id: "panel8",
      title: "8. Operator Telemetry & Analytics",
      badge: "₹1.24L TODAY",
      badgeColor: "#FBBF24",
      icon: <AnalyticsIcon sx={{ color: "#FBBF24", fontSize: 20 }} />,
      component: <OperatorIntelligence />,
    },
    {
      id: "panel9",
      title: "9. Smart Operator Actions & Alternatives",
      badge: "AI ACTION",
      badgeColor: "#2563EB",
      icon: <LightbulbIcon sx={{ color: "#60A5FA", fontSize: 20 }} />,
      component: <SmartSuggestions />,
    },
    {
      id: "panel10",
      title: "10. Session Security & Compliance Audit Log",
      badge: "SECURE LOG",
      badgeColor: "#94A3B8",
      icon: <AdminPanelSettingsIcon sx={{ color: "#94A3B8", fontSize: 20 }} />,
      component: <AuditPanel customerCode={customerCode} beneficiaryCode={beneficiaryCode} />,
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "#60A5FA", fontWeight: 600, fontSize: "20px", mb: 2 }}>
        Expandable Banking Intelligence Workspace
      </Typography>

      <Stack spacing={1.5}>
        {panels.map((p) => {
          const isExp = expanded === p.id;
          return (
            <Accordion
              key={p.id}
              expanded={isExp}
              onChange={handleChange(p.id)}
              elevation={0}
              sx={{
                bgcolor: isExp ? "rgba(18, 27, 48, 0.85)" : "rgba(18, 27, 48, 0.5)",
                backdropFilter: "blur(20px)",
                border: isExp ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "16px !important",
                overflow: "hidden",
                boxShadow: isExp ? "0 8px 32px rgba(37, 99, 235, 0.2)" : "none",
                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#60A5FA" }} />}
                sx={{
                  px: 2.5,
                  minHeight: 56,
                  "&.Mui-expanded": { minHeight: 56 },
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", justifyContent: "space-between", pr: 1 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {p.icon}
                    <Typography sx={{ fontWeight: isExp ? 800 : 700, color: "#FFFFFF", fontSize: "15px" }}>
                      {p.title}
                    </Typography>
                  </Stack>

                  <Chip
                    label={p.badge}
                    size="small"
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      color: p.badgeColor,
                      fontWeight: 800,
                      fontSize: "10px",
                      height: 22,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0.5, borderTop: "1px border-dashed rgba(255, 255, 255, 0.1)" }}>
                {p.component}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
};
