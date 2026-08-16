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
  9: "Shop Details",
  10: "Shop Address",
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
  draftData: any;
  autoSaveToast: string;
  setRegistrationId: (id: string) => void;
  setMobileNumber: (mobile: string) => void;
  setIsBusiness: (isBiz: boolean) => void;
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
  const [draftData, setDraftData] = useState<any>({});
  const [autoSaveToast, setAutoSaveToast] = useState<string>("");

  // Sync currentStep with route pathname & guard completed Step 12
  useEffect(() => {
    if (pathname && ROUTE_STEPS[pathname]) {
      const targetStep = ROUTE_STEPS[pathname];
      const isStep12Done =
        completedSteps.includes(12) ||
        draftData?.step_12_completed === true ||
        draftData?.video_uploaded === true ||
        draftData?.video_status === "VERIFIED" ||
        currentStep >= 13;

      if (targetStep === 12 && isStep12Done) {
        // Step 12 completed! Skip Step 12 and move directly to Step 13
        setCurrentStep(13);
        router.replace("/register/review");
      } else {
        setCurrentStep(targetStep);
      }
    }
  }, [pathname, completedSteps, draftData, currentStep, router]);

  // Load saved draft from Database on mount (Database is single source of truth)
  useEffect(() => {
    const savedRegId = typeof window !== "undefined" ? (localStorage.getItem("pay2pay_reg_id") || "") : "";
    const savedMobile = typeof window !== "undefined" ? (localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile") || "7013914767") : "7013914767";
    const queryKey = savedRegId || savedMobile;

    fetch(`/api/v1/onboarding/resume/${queryKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          setRegistrationId(data.registration_id);
          setMobileNumber(data.mobile_number);

          const loadedCompleted: number[] = data.completed_steps || [];
          const draftD = data.draft_data || {};
          const isStep12Done =
            loadedCompleted.includes(12) ||
            draftD.step_12_completed === true ||
            draftD.video_uploaded === true ||
            draftD.video_status === "VERIFIED" ||
            data.current_step >= 13;

          let loadedStep = data.current_step || 1;
          if (isStep12Done && loadedStep <= 12) {
            loadedStep = 13;
          }

          if (isStep12Done && !loadedCompleted.includes(12)) {
            loadedCompleted.push(12);
          }

          setCompletedSteps(loadedCompleted);
          setCurrentStep(loadedStep);
          setIsBusiness(data.is_business || false);
          setDraftData(draftD);

          if (data.status_name === "KYC_SUBMITTED" || data.status_name === "COMPLETED" || loadedStep >= 14) {
            if (pathname && pathname.startsWith("/register")) {
              router.replace("/retailer-dashboard");
            }
          } else if (isStep12Done && pathname === "/register/video") {
            router.replace("/register/review");
          }

          triggerAutoSaveToast("Welcome back! Onboarding progress loaded from database.");
        }
      })
      .catch(() => {});
  }, []);

  const triggerAutoSaveToast = (msg: string = "Progress Auto-Saved") => {
    setAutoSaveToast(msg);
    setTimeout(() => setAutoSaveToast(""), 3000);
  };

  const handleStepComplete = (nextStepNum: number, updatedDraftData?: any) => {
    triggerAutoSaveToast();
    if (updatedDraftData) {
      setDraftData((prev: any) => ({ ...prev, ...updatedDraftData }));
    }

    const updatedCompleted = Array.from(new Set([...completedSteps, currentStep]));
    if (currentStep === 12 || nextStepNum >= 13) {
      updatedCompleted.push(12);
    }
    setCompletedSteps(updatedCompleted);

    let targetStep = nextStepNum;
    const isStep12Done =
      updatedCompleted.includes(12) ||
      updatedDraftData?.step_12_completed === true ||
      updatedDraftData?.video_uploaded === true ||
      updatedDraftData?.video_status === "VERIFIED";

    if (targetStep === 12 && isStep12Done) {
      targetStep = 13;
    }

    setCurrentStep(targetStep);

    const targetRoute = STEP_ROUTES[targetStep] || "/register/mobile";
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
        draftData,
        autoSaveToast,
        setRegistrationId,
        setMobileNumber,
        setIsBusiness,
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
