"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const STEP_ROUTES: Record<number, string> = {
  1: "/register/mobile",
  2: "/register/mobile-otp",
  3: "/register/email",
  4: "/register/email-otp",
  5: "/register/password",
  6: "/register/pan",
  66: "/register/gst",
  7: "/register/aadhaar",
  8: "/register/bank",
  9: "/register/shop",
  10: "/register/address",
  11: "/register/documents",
  12: "/register/video",
  13: "/register/review",
  14: "/register/submitted"
};

export const ROUTE_STEPS: Record<string, number> = {
  "/register/mobile": 1,
  "/register/mobile-otp": 2,
  "/register/email": 3,
  "/register/email-otp": 4,
  "/register/password": 5,
  "/register/pan": 6,
  "/register/gst": 66,
  "/register/aadhaar": 7,
  "/register/bank": 8,
  "/register/shop": 9,
  "/register/address": 10,
  "/register/documents": 11,
  "/register/video": 12,
  "/register/review": 13,
  "/register/submitted": 14
};

export const STEP_TITLES: Record<number, string> = {
  1: "Mobile Check",
  2: "Mobile OTP",
  3: "Email Address",
  4: "Email OTP",
  5: "Credentials & MPIN",
  6: "PAN Verification",
  66: "GST Verification",
  7: "Aadhaar eKYC",
  8: "Bank Account",
  9: "Business & Shop Profile",
  10: "Business Address",
  11: "Document Upload",
  12: "Video Verification",
  13: "Final Review & Submit",
  14: "Registration Submitted"
};

interface RegistrationContextType {
  registrationId: string;
  mobileNumber: string;
  currentStep: number;
  completedSteps: number[];
  isBusiness: boolean;
  userType: string;
  portalRole: string;
  refId: string;
  draftData: any;
  autoSaveToast: string;
  setRegistrationId: (id: string) => void;
  setMobileNumber: (mobile: string) => void;
  setIsBusiness: (isBiz: boolean) => void;
  setRefId: (ref: string) => void;
  handleStepComplete: (nextStepNum: number, updatedDraftData?: any) => void;
  navigateToStep: (stepNum: number) => void;
  triggerAutoSaveToast: (msg?: string) => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [registrationId, setRegistrationId] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [userType, setUserType] = useState<string>("DISTRIBUTOR");
  const [portalRole, setPortalRole] = useState<string>("DISTRIBUTOR");
  const [refId, setRefId] = useState<string>("");
  const [draftData, setDraftData] = useState<any>({});
  const [autoSaveToast, setAutoSaveToast] = useState<string>("");

  // Parse URL search params dynamically for ref_id / user_type on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get("ref_id") || params.get("ref") || params.get("referral_code") || "";
      const urlType = params.get("user_type") || params.get("userType") || "DISTRIBUTOR";
      if (urlRef) setRefId(urlRef);
      if (urlType) setUserType(urlType.toUpperCase());
    }
  }, []);

  // Sync currentStep with route pathname
  useEffect(() => {
    if (pathname && ROUTE_STEPS[pathname]) {
      setCurrentStep(ROUTE_STEPS[pathname]);
    }
  }, [pathname]);

  // Load saved draft on mount via API resume query
  useEffect(() => {
    let savedRegId = "";
    let savedMobile = "";

    if (typeof window !== "undefined") {
      savedRegId = localStorage.getItem("pay2pay_reg_id") || "";
      savedMobile = localStorage.getItem("pay2pay_reg_mobile") || "";
    }

    if (savedRegId || savedMobile) {
      const queryId = savedRegId || savedMobile;
      fetch(`/api/v1/onboarding/resume/${queryId}?user_type=DISTRIBUTOR`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "SUCCESS") {
            setRegistrationId(data.registration_id || savedRegId);
            setMobileNumber(data.mobile_number || savedMobile);
            const loadedStep = data.current_step || 1;
            setCurrentStep(loadedStep);
            setCompletedSteps(data.completed_steps || []);
            setIsBusiness(data.is_business || false);
            setDraftData(data.draft_data || {});
            if (data.ref_id) setRefId(data.ref_id);
            triggerAutoSaveToast("Welcome back! Resuming your distributor onboarding draft.");
          }
        })
        .catch(() => {});
    }
  }, []);

  const triggerAutoSaveToast = (msg: string = "Progress Auto-Saved") => {
    setAutoSaveToast(msg);
    setTimeout(() => setAutoSaveToast(""), 3000);
  };

  const handleStepComplete = (nextStepNum: number, updatedDraftData?: any) => {
    triggerAutoSaveToast();
    if (updatedDraftData) {
      setDraftData((prev: any) => ({
        ...prev,
        ...updatedDraftData,
        user_type: "DISTRIBUTOR",
        portal_role: "DISTRIBUTOR",
        ref_id: refId
      }));
    }
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep(nextStepNum);

    const targetRoute = STEP_ROUTES[nextStepNum] || "/register/mobile";
    router.push(targetRoute);
  };

  const navigateToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    const targetRoute = STEP_ROUTES[stepNum] || "/register/mobile";
    router.push(targetRoute);
  };

  return (
    <RegistrationContext.Provider
      value={{
        registrationId,
        mobileNumber,
        currentStep,
        completedSteps,
        isBusiness,
        userType,
        portalRole,
        refId,
        draftData,
        autoSaveToast,
        setRegistrationId,
        setMobileNumber,
        setIsBusiness,
        setRefId,
        handleStepComplete,
        navigateToStep,
        triggerAutoSaveToast
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within a RegistrationProvider");
  }
  return context;
};
