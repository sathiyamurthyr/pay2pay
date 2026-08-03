"use client";

import React from "react";
import {
  TextField, TextFieldProps, MenuItem, Select, FormControl, InputLabel, FormHelperText,
  InputAdornment, Box, Typography, Button
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export interface M3TextFieldProps extends Omit<TextFieldProps, "variant"> {
  label: string;
  errorText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const M3TextField = React.forwardRef<HTMLInputElement, M3TextFieldProps>(
  ({ label, errorText, startAdornment, endAdornment, ...props }, ref) => {
    return (
      <TextField
        ref={ref}
        fullWidth
        label={label}
        variant="outlined"
        error={Boolean(errorText)}
        helperText={errorText}
        slotProps={{
          input: {
            startAdornment: startAdornment ? (
              <InputAdornment position="start">{startAdornment}</InputAdornment>
            ) : undefined,
            endAdornment: endAdornment ? (
              <InputAdornment position="end">{endAdornment}</InputAdornment>
            ) : undefined,
            sx: { borderRadius: 2.5, backgroundColor: "#FFFFFF" },
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: errorText ? "#DC2626" : "#E5E7EB" },
            "&:hover fieldset": { borderColor: errorText ? "#DC2626" : "#94A3B8" },
            "&.Mui-focused fieldset": { borderColor: errorText ? "#DC2626" : "#2563EB" },
          },
          "& .MuiInputLabel-root": { color: "#6B7280" },
          "& .MuiInputLabel-root.Mui-focused": { color: errorText ? "#DC2626" : "#2563EB" },
        }}
        {...props}
      />
    );
  }
);
M3TextField.displayName = "M3TextField";

export interface M3SelectOption {
  value: string | number;
  label: string;
}

export interface M3SelectProps {
  label: string;
  value: string | number;
  onChange: (e: any) => void;
  options: M3SelectOption[];
  errorText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const M3Select: React.FC<M3SelectProps> = ({
  label,
  value,
  onChange,
  options,
  errorText,
  disabled = false,
  fullWidth = true,
}) => {
  return (
    <FormControl fullWidth={fullWidth} error={Boolean(errorText)} disabled={disabled}>
      <InputLabel id={`m3-select-${label}-label`}>{label}</InputLabel>
      <Select
        labelId={`m3-select-${label}-label`}
        value={value}
        label={label}
        onChange={onChange}
        sx={{ borderRadius: 2.5, backgroundColor: "#FFFFFF" }}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {errorText && <FormHelperText error>{errorText}</FormHelperText>}
    </FormControl>
  );
};

export const M3CurrencyInput = React.forwardRef<HTMLInputElement, M3TextFieldProps>(
  (props, ref) => {
    return (
      <M3TextField
        ref={ref}
        startAdornment={<Typography sx={{ fontWeight: 700, color: "#2563EB" }}>₹</Typography>}
        placeholder="0.00"
        type="number"
        {...props}
      />
    );
  }
);
M3CurrencyInput.displayName = "M3CurrencyInput";

export interface M3FileUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  fileName?: string;
  errorText?: string;
  accept?: string;
}

export const M3FileUpload: React.FC<M3FileUploadProps> = ({
  label,
  onFileSelect,
  fileName,
  errorText,
  accept = "image/*,.pdf",
}) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151", mb: 1 }}>
        {label}
      </Typography>
      <Box
        sx={{
          border: `2px dashed ${errorText ? "#DC2626" : "#E5E7EB"}`,
          borderRadius: 3,
          p: 3,
          textAlign: "center",
          backgroundColor: "#F8FAFC",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: "#F1F5F9", borderColor: "#2563EB" },
        }}
        component="label"
      >
        <input
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              onFileSelect(files[0]);
            }
          }}
        />
        <CloudUploadIcon sx={{ fontSize: 36, color: "#2563EB", mb: 1 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827" }}>
          {fileName ? fileName : "Click or drag to upload document"}
        </Typography>
        <Typography variant="caption" sx={{ color: "#6B7280", display: "block", mt: 0.5 }}>
          Supports JPG, PNG, PDF up to 5MB
        </Typography>
      </Box>
      {errorText && (
        <Typography variant="caption" sx={{ color: "#DC2626", mt: 0.5, display: "block" }}>
          {errorText}
        </Typography>
      )}
    </Box>
  );
};
