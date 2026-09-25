"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "./api";

export interface SalesUser {
  public_id: string;
  sales_user_ref_id?: number;
  email: string;
  full_name: string;
  mobile?: string;
  phone?: string;
  employee_code?: string;
  username?: string;
  designation?: string;
  department?: string;
  territory?: string;
  status: string;
  tenant_id: string;
  tenant_name?: string;
  company_id?: string;
  company_name?: string;
  mappings_count?: number;
}

interface SalesAuthContextType {
  user: SalesUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendWhatsAppOtp: (identifier: string) => Promise<{ success: boolean; session_id?: string; masked_mobile?: string; demo_otp?: string; error?: string }>;
  verifyWhatsAppOtp: (sessionId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const SalesAuthContext = createContext<SalesAuthContextType | undefined>(undefined);

export const SalesAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const verifySession = async () => {
    try {
      const res = await apiClient.get("/sales/auth/me");
      if (res.data && res.data.public_id) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  const setAuthenticatedSession = (accessToken: string, userData: any) => {
    const maxAge = 86400 * 7; // 7 days
    document.cookie = `p2p_sales_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
    sessionStorage.setItem("p2p_sales_token", accessToken);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("p2p_sales_token", accessToken);
    }
    setUser(userData);
  };

  const login = async (identifier: string, password: string) => {
    try {
      const res = await apiClient.post("/sales/auth/login", {
        identifier,
        email: identifier,
        password
      });
      if (res.data && res.data.access_token) {
        setAuthenticatedSession(res.data.access_token, res.data.user);
        return { success: true };
      }
      return { success: false, error: "Invalid response from server" };
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Invalid credentials. Please verify your email/password.";
      return { success: false, error: detail };
    }
  };

  const sendWhatsAppOtp = async (identifier: string) => {
    try {
      const res = await apiClient.post("/sales/auth/whatsapp/send-otp", {
        identifier,
        mobile: identifier
      });
      if (res.data && res.data.session_id) {
        return {
          success: true,
          session_id: res.data.session_id,
          masked_mobile: res.data.masked_mobile,
          demo_otp: res.data.demo_otp
        };
      }
      return { success: false, error: res.data?.message || "Failed to dispatch WhatsApp OTP" };
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Unable to send WhatsApp OTP. Please verify your mobile number.";
      return { success: false, error: detail };
    }
  };

  const verifyWhatsAppOtp = async (sessionId: string, otp: string) => {
    try {
      const res = await apiClient.post("/sales/auth/whatsapp/verify-otp", {
        session_id: sessionId,
        otp
      });
      if (res.data && res.data.access_token) {
        setAuthenticatedSession(res.data.access_token, res.data.user);
        return { success: true };
      }
      return { success: false, error: "Invalid response from server" };
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Invalid OTP code entered. Please try again.";
      return { success: false, error: detail };
    }
  };

  const logout = () => {
    document.cookie = "p2p_sales_token=; path=/; max-age=0";
    sessionStorage.removeItem("p2p_sales_token");
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("p2p_sales_token");
    }
    setUser(null);
    router.replace("/login");
  };

  return (
    <SalesAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        sendWhatsAppOtp,
        verifyWhatsAppOtp,
        logout,
        refreshUser: verifySession,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
};

export const useSalesAuth = () => {
  const context = useContext(SalesAuthContext);
  if (!context) {
    throw new Error("useSalesAuth must be used within a SalesAuthProvider");
  }
  return context;
};
