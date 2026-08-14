import React from "react";
import { Box } from "@mui/material";
import { EnterpriseHeader } from "./components/EnterpriseHeader";
import { EnterpriseSidebar } from "./components/EnterpriseSidebar";
import { OperationsPanel } from "./components/OperationsPanel";
import { StickyFooter } from "./components/StickyFooter";
import { useSidebar } from "./hooks/useSidebar";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { getResponsiveGridDimensions, gridLayoutAreas } from "./styles/layout";
import { tokens } from "@/design-system/tokens/design-tokens";
import { SessionSecurityProvider } from "@/context/SessionSecurityProvider";
import { WalletSyncProvider } from "@/context/WalletSyncProvider";
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
  activePath,
  leftSidebarContent,
  rightOperationsContent,
  footerContent,
  children,
}) => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const breakpoint = useBreakpoint();

  const dimensions = typeof window !== "undefined" ? getResponsiveGridDimensions(window.innerWidth) : { sidebarWidth: "300px", operationsWidth: "360px" };
  const activeSidebarWidth = isCollapsed ? "76px" : dimensions.sidebarWidth;

  // Only render 6-step transaction footer on transaction workstation routes (e.g. /retailer/dmt)
  const isTransactionWorkstation = Boolean(activePath?.startsWith("/retailer/dmt") || activePath?.includes("/workstation"));
  const actualFooter = footerContent !== undefined ? footerContent : (isTransactionWorkstation ? <StickyFooter /> : null);
  const showFooter = actualFooter !== null;

  return (
    <>
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: tokens.colors.neutral.dark.bg,
          color: tokens.colors.neutral.dark.textPrimary,
          display: "grid",
          gridTemplateAreas: gridLayoutAreas,
          gridTemplateColumns: `${activeSidebarWidth} minmax(0, 1fr) ${dimensions.operationsWidth}`,
          gridTemplateRows: showFooter ? "80px minmax(0, 1fr) 64px" : "80px minmax(0, 1fr) 0px",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
        }}
      >
        {/* HEADER AREA */}
        <Box sx={{ gridArea: "header", width: "100%", zIndex: 1100 }}>
          <EnterpriseHeader pageTitle={pageTitle} />
        </Box>

        {/* SIDEBAR AREA */}
        <Box sx={{ gridArea: "sidebar", height: "100%", overflowY: "auto", minWidth: 0 }}>
          {leftSidebarContent || <EnterpriseSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} activePath={activePath} />}
        </Box>

        {/* WORKSPACE AREA */}
        <Box
          sx={{
            gridArea: "workspace",
            height: "100%",
            overflowY: "auto",
            width: "100%",
            minWidth: 0,
            p: 3,
          }}
        >
          {children}
        </Box>

        {/* OPERATIONS PANEL AREA */}
        <Box sx={{ gridArea: "operations", height: "100%", overflowY: "auto", minWidth: 0 }}>
          {rightOperationsContent || <OperationsPanel width={dimensions.operationsWidth} />}
        </Box>

        {/* FOOTER AREA */}
        {showFooter && (
          <Box sx={{ gridArea: "footer", width: "100%", zIndex: 1000 }}>
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
  <WalletSyncProvider>
    <SessionSecurityProvider>
      <AppShellContent {...props} />
    </SessionSecurityProvider>
  </WalletSyncProvider>
);
