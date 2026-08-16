import React from "react";
import { Box } from "@mui/material";
import { EnterpriseHeader } from "./components/EnterpriseHeader";
import { EnterpriseSidebar } from "./components/EnterpriseSidebar";
import { OperationsPanel } from "./components/OperationsPanel";
import { StickyFooter } from "./components/StickyFooter";
import { useSidebar } from "./hooks/useSidebar";
import { gridLayoutAreas } from "./styles/layout";
import { SessionSecurityProvider } from "@/context/SessionSecurityProvider";

import { SessionWarningDialog } from "@/components/security/SessionWarningDialog";
import { SessionLockScreenOverlay } from "@/components/security/SessionLockScreenOverlay";

export interface AppShellProps {
  pageTitle?: string;
  activePath?: string;
  leftSidebarContent?: React.ReactNode;
  rightOperationsContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShellContent: React.FC<AppShellProps> = ({
  pageTitle,
  activePath = "/retailer/dashboard",
  leftSidebarContent,
  rightOperationsContent,
  footerContent,
  children,
}) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  const isPayouts = Boolean(activePath?.includes("/payouts"));
  const activeSidebarWidth = isCollapsed ? "72px" : "230px";
  const operationsWidth = (rightOperationsContent !== null && !isPayouts) ? "300px" : "0px";

  const isTransactionWorkstation = Boolean(activePath?.startsWith("/retailer/dmt") || activePath?.includes("/workstation"));
  const actualFooter = footerContent !== undefined ? footerContent : (isTransactionWorkstation ? <StickyFooter /> : null);
  const showFooter = actualFooter !== null;

  return (
    <>
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "#090D16",
          color: "#F8FAFC",
          display: "grid",
          gridTemplateAreas: gridLayoutAreas,
          gridTemplateColumns: `${activeSidebarWidth} minmax(0, 1fr) ${operationsWidth}`,
          gridTemplateRows: showFooter ? "64px minmax(0, 1fr) 64px" : "64px minmax(0, 1fr) 0px",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
        }}
      >
        {/* GLOBAL HEADER AREA */}
        <Box sx={{ gridArea: "header", width: "100%", height: "64px", zIndex: 1100, overflow: "hidden" }}>
          <EnterpriseHeader pageTitle={pageTitle} />
        </Box>

        {/* SIDEBAR AREA */}
        <Box sx={{ gridArea: "sidebar", height: "100%", overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>
          {leftSidebarContent || <EnterpriseSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} activePath={activePath} />}
        </Box>

        {/* PRIMARY WORKSPACE AREA */}
        <Box
          sx={{
            gridArea: "workspace",
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%",
            minWidth: 0,
            p: { xs: 2, md: 3 },
            boxSizing: "border-box",
          }}
        >
          {children}
        </Box>

        {/* OPERATIONS AREA */}
        {operationsWidth !== "0px" && (
          <Box sx={{ gridArea: "operations", height: "100%", overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>
            {rightOperationsContent || <OperationsPanel width={operationsWidth} />}
          </Box>
        )}

        {/* FOOTER AREA */}
        {showFooter && (
          <Box sx={{ gridArea: "footer", width: "100%", height: "64px", zIndex: 1000, overflow: "hidden" }}>
            {actualFooter}
          </Box>
        )}
      </Box>

      {/* SESSION SECURITY MODALS */}
      <SessionWarningDialog />
      <SessionLockScreenOverlay />
    </>
  );
};

export const AppShell: React.FC<AppShellProps> = (props) => (
  <SessionSecurityProvider>
    <AppShellContent {...props} />
  </SessionSecurityProvider>
);
