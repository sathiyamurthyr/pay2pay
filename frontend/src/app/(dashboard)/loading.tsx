"use client";

import React from "react";
import { Box, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export default function DashboardLoading() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#FFFFFF", minHeight: "100vh", color: "#292329" }}>
      {/* 1. Header Toolbar Skeleton */}
      <Paper
        sx={{
          p: 2.5,
          bgcolor: "#FFFFFF",
          border: "1px solid #E8E2E5",
          borderRadius: "12px",
          mb: 3,
          display: "flex",
          justify: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Skeleton variant="text" width={180} height={32} sx={{ bgcolor: "rgba(41,35,41,0.08)", borderRadius: "4px" }} />
          <Skeleton variant="text" width={260} height={18} sx={{ bgcolor: "rgba(41,35,41,0.04)", mt: 0.5, borderRadius: "4px" }} />
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Skeleton variant="rectangular" width={100} height={36} sx={{ bgcolor: "rgba(41,35,41,0.06)", borderRadius: "8px" }} />
          <Skeleton variant="rectangular" width={100} height={36} sx={{ bgcolor: "rgba(41,35,41,0.06)", borderRadius: "8px" }} />
        </Stack>
      </Paper>

      {/* 2. KPI Cards Row Skeleton */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((idx) => (
          <Paper
            key={idx}
            sx={{
              flex: 1,
              p: 2.5,
              bgcolor: "#FFFFFF",
              border: "1px solid #E8E2E5",
              borderRadius: "12px",
            }}
          >
            <Skeleton variant="text" width={100} height={16} sx={{ bgcolor: "rgba(41,35,41,0.06)" }} />
            <Skeleton variant="text" width={140} height={36} sx={{ bgcolor: "rgba(41,35,41,0.08)", my: 1 }} />
            <Skeleton variant="text" width={80} height={16} sx={{ bgcolor: "rgba(41,35,41,0.04)" }} />
          </Paper>
        ))}
      </Stack>

      {/* 3. Main Data Table Skeleton */}
      <Paper sx={{ bgcolor: "#FFFFFF", border: "1px solid #E8E2E5", borderRadius: "12px", overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #E8E2E5", display: "flex", justifyContent: "space-between" }}>
          <Skeleton variant="rectangular" width={280} height={38} sx={{ bgcolor: "rgba(41,35,41,0.06)", borderRadius: "8px" }} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rectangular" width={90} height={38} sx={{ bgcolor: "rgba(41,35,41,0.06)", borderRadius: "8px" }} />
            <Skeleton variant="rectangular" width={90} height={38} sx={{ bgcolor: "rgba(41,35,41,0.06)", borderRadius: "8px" }} />
          </Stack>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#FAF8F9" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <TableCell key={i}>
                    <Skeleton variant="text" width={80} height={20} sx={{ bgcolor: "rgba(41,35,41,0.08)" }} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3, 4, 5, 6].map((rowIdx) => (
                <TableRow key={rowIdx}>
                  {[1, 2, 3, 4, 5, 6, 7].map((colIdx) => (
                    <TableCell key={colIdx} sx={{ borderBottom: "1px solid #E8E2E5", py: 2 }}>
                      <Skeleton variant="text" width="85%" height={20} sx={{ bgcolor: "rgba(41,35,41,0.04)" }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
