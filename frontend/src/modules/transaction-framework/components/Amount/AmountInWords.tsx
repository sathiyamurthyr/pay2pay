import React from "react";
import { Typography, Box } from "@mui/material";

export function numberToIndianWords(num: number): string {
  if (num <= 0 || isNaN(num)) return "Zero Rupees Only";

  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n: number): string {
    let str = "";
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 10 && n < 20) {
      str += teens[n - 10] + " ";
    } else if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      if (n % 10 > 0) {
        str += single[n % 10] + " ";
      }
    } else if (n > 0) {
      str += single[n] + " ";
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore > 0) {
    result += convertChunk(crore) + "Crore ";
  }
  if (lakh > 0) {
    result += convertChunk(lakh) + "Lakh ";
  }
  if (thousand > 0) {
    result += convertChunk(thousand) + "Thousand ";
  }
  if (num > 0) {
    result += convertChunk(num);
  }

  return result.trim() + " Rupees Only";
}

export const AmountInWords: React.FC<{ amount: number }> = ({ amount }) => {
  const words = numberToIndianWords(amount);

  return (
    <Box sx={{ mt: 1, minHeight: 24, display: "flex", alignItems: "center" }}>
      <Typography
        sx={{
          color: "#FFFFFF",
          opacity: 0.9,
          fontWeight: 500,
          fontSize: "16px",
          fontStyle: "italic",
          lineHeight: 1.3,
        }}
      >
        {words}
      </Typography>
    </Box>
  );
};
