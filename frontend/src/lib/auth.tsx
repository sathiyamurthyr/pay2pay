"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api";

interface User {
  public_id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  roles: string[];
  mfa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string, mfaCode?: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user_info");
      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user_info");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (emailOrUsername: string, password: string, mfaCode?: string) => {
    const res = await apiClient.post("/auth/login", {
      email_or_username: emailOrUsername,
      password: password,
      mfa_code: mfaCode,
    });
    const data = res.data;
    if (data.requires_mfa) {
      return data;
    }
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_info", JSON.stringify(data.user));
      setUser(data.user);
      router.push("/dashboard");
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
