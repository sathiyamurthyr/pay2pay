"use client";

import React, { useState } from "react";
import { IconButton, Tooltip, Snackbar, Alert } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

interface CopyButtonProps {
  value: string;
  tooltipTitle?: string;
  size?: "small" | "medium";
  iconFontSize?: number;
  showToast?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  tooltipTitle = "Copy",
  size = "small",
  iconFontSize = 14,
  showToast = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!value || value === "--" || value === "N/A") return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopied(true);
      if (showToast) setToastOpen(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.warn("Failed to copy to clipboard:", err);
    }
  };

  return (
    <>
      <Tooltip title={copied ? "Copied!" : tooltipTitle} arrow placement="top">
        <IconButton
          size={size}
          onClick={handleCopy}
          sx={{
            p: 0.3,
            ml: 0.4,
            verticalAlign: "middle",
            color: copied ? "#10B981" : "rgba(255, 255, 255, 0.45)",
            "&:hover": {
              color: copied ? "#10B981" : "#60A5FA",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            },
            transition: "all 0.15s ease",
          }}
        >
          {copied ? (
            <CheckIcon sx={{ fontSize: iconFontSize }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: iconFontSize }} />
          )}
        </IconButton>
      </Tooltip>

      {showToast && (
        <Snackbar
          open={toastOpen}
          autoHideDuration={2000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setToastOpen(false)}
            severity="success"
            sx={{
              bgcolor: "#0F172A",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontWeight: 600,
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              "& .MuiAlert-icon": { color: "#10B981" },
            }}
          >
            Copied to clipboard.
          </Alert>
        </Snackbar>
      )}
    </>
  );
};
