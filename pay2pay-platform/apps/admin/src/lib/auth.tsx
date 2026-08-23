"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

export type UserRole = "PLATFORM_ADMIN" | "RETAILER" | "OPERATIONS_ADMIN";

export interface User {
  public_id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  roles: string[];
  user_type?: string;
  mfa_enabled?: boolean;
  approval_status?: string;
  status?: string;
  is_approved?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeRole: UserRole;
  isRetailer: boolean;
  isAdmin: boolean;
  switchRole: (role: UserRole) => void;
  login: (emailOrUsername: string, password: string, mfaCode?: string) => Promise<unknown>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  activeRole: "RETAILER",
  isRetailer: true,
  isAdmin: false,
  switchRole: () => {},
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>("RETAILER");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Synchronize authentication state with secure session cookies
  useEffect(() => {
    const initAuth = async () => {
      if (typeof document === "undefined") {
        setLoading(false);
        return;
      }

      // Check for valid session cookie
      const cookies = document.cookie.split("; ");
      const tokenCookie = cookies.find((row) =>
        row.startsWith("p2p_access_token=") ||
        row.startsWith("pay2pay_access_token=") ||
        row.startsWith("pay2pay_auth_token=")
      );

      const tokenValue = tokenCookie ? tokenCookie.split("=")[1] : null;

      if (!tokenValue || tokenValue.trim().length < 10) {
        // No valid session cookie found: wipe any stale in-memory & local state
        setUser(null);
        setLoading(false);
        return;
      }

      // Load transient user profile details
      try {
        const storedUser = localStorage.getItem("user_info") || localStorage.getItem("pay2pay_user_data");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (!parsed.roles || !Array.isArray(parsed.roles)) {
            parsed.roles = [parsed.role || "RETAILER"];
          }
          setUser(parsed);
          const isRet = parsed.roles.includes("RETAILER") || parsed.role === "RETAILER";
          setActiveRole(isRet ? "RETAILER" : "PLATFORM_ADMIN");
        } else {
          // Construct minimal profile from active session
          setUser({
            public_id: "authenticated_session",
            email: "merchant@pay2pay.in",
            full_name: "Retailer Partner",
            tenant_id: "547aa7bb-a790-4fe2-bd5b-27214ed176c8",
            roles: ["RETAILER"],
            approval_status: "APPROVED",
            status: "ACTIVE",
            is_approved: true,
          });
          setActiveRole("RETAILER");
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 2. Cross-Tab Realtime Logout Synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const authChannel = new BroadcastChannel("p2p_session_auth_channel");
      authChannel.onmessage = (event) => {
        if (event.data?.type === "GLOBAL_LOGOUT") {
          setUser(null);
          // Purge stores
          try {
            useTransactionMemoryStore.getState().setSelectedCustomer(null);
          } catch {}
          if (!window.location.pathname.includes("/login")) {
            window.location.replace("/login?reason=session_terminated");
          }
        }
      };
      return () => {
        authChannel.close();
      };
    }
  }, []);

  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (user) {
      const updatedUser = {
        ...user,
        full_name: newRole === "RETAILER" ? "Retailer Merchant Agent" : "Platform Admin",
        roles: [newRole],
      };
      setUser(updatedUser);
    }
  };

  const login = async (emailOrUsername: string, password: string, mfaCode?: string) => {
    try {
      const res = await apiClient.post("/auth/enterprise/password-login", {
        mobile_number: emailOrUsername,
        password: password,
        accepted_terms: true,
      });
      const data = res.data?.data || res.data;
      if (data?.access_token) {
        const token = data.access_token;
        const userData = data.user || {
          public_id: data.retailer_id || "ret_user",
          email: `${emailOrUsername}@pay2pay.in`,
          full_name: data.owner_name || "Retailer Partner",
          tenant_id: "547aa7bb-a790-4fe2-bd5b-27214ed176c8",
          roles: ["RETAILER"],
          approval_status: data.is_approved ? "APPROVED" : "PENDING",
          status: data.account_status || "ACTIVE",
          is_approved: data.is_approved ?? true,
        };

        setUser(userData);
        setActiveRole("RETAILER");

        if (typeof document !== "undefined") {
          document.cookie = `p2p_access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `pay2pay_access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `pay2pay_auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `p2p_user_role=RETAILER; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `pay2pay_user_role=RETAILER; path=/; max-age=86400; SameSite=Lax`;
        }

        try {
          localStorage.setItem("user_info", JSON.stringify(userData));
        } catch {}

        return data;
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  // 3. Absolute, Authoritative Logout Procedure
  const logout = () => {
    // A. Trigger backend session termination & revocation
    try {
      fetch("/api/v1/auth/enterprise/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_info: typeof navigator !== "undefined" ? navigator.userAgent : "Browser" }),
      }).catch(() => {});
      fetch("/api/v1/auth/logout", {
        method: "POST",
      }).catch(() => {});
    } catch {}

    // B. Broadcast cross-tab logout to terminate all open tabs immediately
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const authChannel = new BroadcastChannel("p2p_session_auth_channel");
        authChannel.postMessage({ type: "GLOBAL_LOGOUT", timestamp: Date.now() });
      } catch {}
    }

    // C. Remove all authentication and session cookies across host and root domain
    if (typeof document !== "undefined") {
      const cookieNames = [
        "pay2pay_access_token",
        "p2p_access_token",
        "pay2pay_auth_token",
        "p2p_user_role",
        "pay2pay_user_role",
        "p2p_session_locked",
        "p2p_session_id",
        "p2p_destination",
        "token",
        "access_token",
        "p2p_active_retailer_id",
      ];
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        try {
          document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        } catch {}
        try {
          const parts = window.location.hostname.split(".");
          if (parts.length >= 2) {
            const rootDomain = parts.slice(-2).join(".");
            document.cookie = `${name}=; path=/; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          }
        } catch {}
      });
    }

    // D. Clear all client storage
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.clear();
      } catch {}
    }

    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.clear();
      } catch {}
    }

    // E. Clear in-memory state and reset stores
    setUser(null);
    try {
      useTransactionMemoryStore.getState().setSelectedCustomer(null);
    } catch {}

    // F. Direct fail-closed redirect to login
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    } else {
      router.replace("/login");
    }
  };

  const isRetailer = activeRole === "RETAILER";
  const isAdmin = activeRole === "PLATFORM_ADMIN" || activeRole === "OPERATIONS_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeRole,
        isRetailer,
        isAdmin,
        switchRole,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
