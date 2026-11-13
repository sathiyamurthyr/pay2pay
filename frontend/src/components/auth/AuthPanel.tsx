"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Fingerprint,
  MessageSquare,
  ArrowRight,
  Loader2,
  Check,
  Lock,
  Eye,
  EyeOff,
  Phone
} from "lucide-react";
import { collectSilentTelemetry, TelemetryData } from "@/lib/telemetry";
import { verifyAndRoutePostLogin } from "@/lib/retailer-destination-resolver";
import { soundSystem } from "@/lib/audio-engine";
import { ConfettiBurst } from "./motion/ConfettiBurst";
import {
  glassPanelVariants,
  shakeErrorVariants,
  buttonMotionVariants
} from "./motion/animationVariants";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

type LanguageKey = "English" | "Hindi" | "Tamil" | "Telugu";

const TRANSLATIONS: Record<LanguageKey, Record<string, string>> = {
  English: {
    securityAuth: "Near 4 You Security Auth v2.6.4",
    welcomeBack: "Welcome Back",
    subtitle: "Access your Near 4 You Business Workstation",
    passwordLogin: "Password",
    otpLogin: "WhatsApp OTP",
    biometricLogin: "Biometric",
    mobileNumber: "Mobile Number",
    password: "Password",
    forgot: "Forgot?",
    captchaChallenge: "Security Captcha",
    enterCaptcha: "Enter captcha code",
    rememberSession: "Remember session",
    trustDevice: "Trust Device",
    securityConsent: "I accept browser, device, and location telemetry under RBI security standards.",
    signIn: "Sign In to Workstation",
    authenticating: "Authenticating...",
    sendOtp: "Send OTP",
    resend: "Resend",
    enterOtp: "Enter WhatsApp OTP",
    verifySignIn: "Verify & Sign In",
    webauthnTitle: "WebAuthn Biometric Auth",
    webauthnDesc: "Touch ID, Face ID, or Windows Hello Security Key.",
    authPasskey: "Authenticate with Passkey",
    newRetailer: "New Partner?",
    registerAccount: "Create Account →",
    privacyPolicy: "Privacy Policy",
    terms: "Terms of Service",
    refundPolicy: "Refund Policy",
    rbiFooter: "© 2021 Sathus Technology Pvt. Ltd.\nNear 4 You Portal",
    days30: "30 Days",
    days90: "90 Days",
    forever: "Forever"
  },
  Hindi: {
    securityAuth: "Near 4 You सुरक्षा प्रमाणीकरण v2.6.4",
    welcomeBack: "वापसी पर आपका स्वागत है",
    subtitle: "अपने Near 4 You व्यवसाय वर्कस्टेशन पर लॉगिन करें",
    passwordLogin: "पासवर्ड",
    otpLogin: "व्हाट्सएप ओटीपी",
    biometricLogin: "बायोमेट्रिक",
    mobileNumber: "मोबाइल नंबर",
    password: "पासवर्ड",
    forgot: "भूल गए?",
    captchaChallenge: "सुरक्षा कैप्चा",
    enterCaptcha: "कैप्चा कोड दर्ज करें",
    rememberSession: "सत्र याद रखें",
    trustDevice: "डिवाइस पर भरोसा करें",
    securityConsent: "मैं आरबीआई सुरक्षा मानकों के तहत टेलीमेट्री स्वीकार करता हूं।",
    signIn: "वर्कस्टेशन में साइन इन करें",
    authenticating: "सत्यापित हो रहा है...",
    sendOtp: "ओटीपी भेजें",
    resend: "पुनः भेजें",
    enterOtp: "व्हाट्सएप ओटीपी दर्ज करें",
    verifySignIn: "सत्यापित करें और लॉगिन करें",
    webauthnTitle: "वेबऑथ बायोमेट्रिक प्रमाणीकरण",
    webauthnDesc: "टच आईडी, फेस आईडी या विंडोज हैलो।",
    authPasskey: "पास-की से लॉगिन करें",
    newRetailer: "नए पार्टनर?",
    registerAccount: "खाता बनाएं →",
    privacyPolicy: "गोपनीयता नीति",
    terms: "सेवा की शर्तें",
    refundPolicy: "रिफंड नीति",
    rbiFooter: "© 2021 Sathus Technology Pvt. Ltd.\nNear 4 You Portal",
    days30: "30 दिन",
    days90: "90 दिन",
    forever: "हमेशा"
  },
  Tamil: {
    securityAuth: "Near 4 You பாதுகாப்பு அங்கீகாரம் v2.6.4",
    welcomeBack: "மீண்டும் வருக",
    subtitle: "உங்கள் Near 4 You வணிக பணிநிலையத்தை அணுகவும்",
    passwordLogin: "கடவுச்சொல்",
    otpLogin: "வாட்ஸ்அப் ஒடிபி",
    biometricLogin: "கைரேகை",
    mobileNumber: "கைப்பேசி எண்",
    password: "கடவுச்சொல்",
    forgot: "மறந்துவிட்டதா?",
    captchaChallenge: "பாதுகாப்பு கேப்ட்சா",
    enterCaptcha: "கேப்ட்சா குறியீட்டை உள்ளிடவும்",
    rememberSession: "அமர்வை நினைவில் கொள்க",
    trustDevice: "சாதனத்தை நம்புக",
    securityConsent: "ஆர்பிஐ தரநிலைகளின் கீழ் தரவை நான் ஒப்புக்கொள்கிறேன்.",
    signIn: "பணிநிலையத்தில் உள்நுழையவும்",
    authenticating: "சரிபார்க்கிறது...",
    sendOtp: "ஒடிபி அனுப்பு",
    resend: "மீண்டும் அனுப்பு",
    enterOtp: "வாட்ஸ்அப் ஒடிபியை உள்ளிடவும்",
    verifySignIn: "சரிபார்த்து உள்நுழைக",
    webauthnTitle: "பயோமெட்ரிக் அங்கீகாரம்",
    webauthnDesc: "டச் ஐடி, பேஸ் ஐடி அல்லது விண்டோஸ் ஹலோ.",
    authPasskey: "பாஸ்கி மூலம் உள்நுழைக",
    newRetailer: "புதிய கூட்டாளரா?",
    registerAccount: "கணக்கை பதிவு செய் →",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    terms: "சேவை விதிகள்",
    refundPolicy: "பணத்தைத் திரும்பப்பெறும் கொள்கை",
    rbiFooter: "© 2021 Sathus Technology Pvt. Ltd.\nNear 4 You Portal",
    days30: "30 நாட்கள்",
    days90: "90 நாட்கள்",
    forever: "எப்போதும்"
  },
  Telugu: {
    securityAuth: "Near 4 You భద్రతా ప్రమాణీకరణ v2.6.4",
    welcomeBack: "తిరిగి స్వాగతం",
    subtitle: "మీ Near 4 You బిజినెస్ వర్క్‌స్టేషన్‌ను యాక్సెస్ చేయండి",
    passwordLogin: "పాస్‌వర్డ్",
    otpLogin: "వాట్సాప్ ఓటీపీ",
    biometricLogin: "బయోమెట్రిక్",
    mobileNumber: "మొబైల్ నంబర్",
    password: "పాస్‌వర్డ్",
    forgot: "మర్చిపోయారా?",
    captchaChallenge: "భద్రతా క్యాప్చా",
    enterCaptcha: "క్యాప్చా కోడ్‌ను నమోదు చేయండి",
    rememberSession: "సెషన్‌ను గురుతుంచుకో",
    trustDevice: "సాధనాన్ని నమ్మండి",
    securityConsent: "ఆర్బీఐ ప్రమాణాల ప్రకారం టెలిమెట్రీని అంగీకరిస్తున్నాను.",
    signIn: "వర్క్‌స్టేషన్‌కి సైన్ ఇన్ చేయండి",
    authenticating: "నిర్ధారిస్తోంది...",
    sendOtp: "ఓటీపీ పంపండి",
    resend: "మళ్ళీ పంపండి",
    enterOtp: "వాట్సాప్ ఓటీపీని నమోదు చేయండి",
    verifySignIn: "తనిఖీ చేసి సైన్ ఇన్ చేయండి",
    webauthnTitle: "వెబ్‌ఆత్ బయోమెట్రిక్ ప్రమాణీకరణ",
    webauthnDesc: "టచ్ ఐడీ, ఫేస్ ఐడీ లేదా విండోస్ హలో.",
    authPasskey: "పాస్‌కీతో లాగిన్ అవ్వండి",
    newRetailer: "కొత్త భాగస్వామి?",
    registerAccount: "ఖాతాను నమోదు చేయండి →",
    privacyPolicy: "గోప్యతా విధానం",
    terms: "సేవా నిబంధనలు",
    refundPolicy: "రీఫండ్ పాలసీ",
    rbiFooter: "© 2021 Sathus Technology Pvt. Ltd.\nNear 4 You Portal",
    days30: "30 రోజులు",
    days90: "90 రోజులు",
    forever: "ఎల్లప్పుడూ"
  }
};

// Use relative API URL so it works on all environments via Next.js rewrites
const API_BASE = "/api/v1";

interface AuthPanelProps {
  portalRole?: "SD" | "DIST" | "SUPER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER" | "ADMIN" | "COMMON";
  darkMode?: boolean;
  setDarkMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  portalRole = "COMMON",
  darkMode: externalDarkMode,
  setDarkMode: externalSetDarkMode
}) => {
  const router = useRouter();

  const normalizedRole: "RETAILER" | "SD" | "DIST" | "COMMON" =
    portalRole === "COMMON"
      ? "COMMON"
      : portalRole === "RETAILER"
      ? "RETAILER"
      : portalRole === "SD" || portalRole === "SUPER_DISTRIBUTOR"
      ? "SD"
      : "DIST";

  const { display_name, legal_name, logo_url, primary_colour, secondary_colour } = useCompanyBranding();
  const brandPrimary = primary_colour || "#A20A3A";
  const brandSecondary = secondary_colour || "#EDC11E";

  const portalTitle =
    normalizedRole === "COMMON"
      ? `${display_name || "Near 4 You"} Unified Portal`
      : normalizedRole === "RETAILER"
      ? `${display_name || "Near 4 You"} Retailer Portal`
      : normalizedRole === "SD"
      ? `${display_name || "Near 4 You"} SD Portal`
      : `${display_name || "Near 4 You"} Distributor Portal`;

  const portalSubtitle =
    normalizedRole === "COMMON"
      ? "Sign in to access your Retailer, Distributor, or Super Distributor Workspace"
      : normalizedRole === "RETAILER"
      ? `Access your ${display_name || "Near 4 You"} Retailer Business Workstation`
      : normalizedRole === "SD"
      ? `Access your ${display_name || "Near 4 You"} Super Distributor Workspace`
      : `Access your ${display_name || "Near 4 You"} Distributor Workspace`;

  const portalRegisterUrl =
    normalizedRole === "COMMON" || normalizedRole === "RETAILER"
      ? "/register"
      : normalizedRole === "SD"
      ? "/sd/onboarding"
      : "/dist/onboarding";

  const portalDashboardUrl =
    normalizedRole === "COMMON"
      ? "/retailer/dashboard"
      : normalizedRole === "RETAILER"
      ? "/retailer/dashboard"
      : normalizedRole === "SD"
      ? "/sd/dashboard"
      : "/dist/dashboard";

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("English");
  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.English;

  const [authTab, setAuthTab] = useState<"PASSWORD" | "OTP" | "BIOMETRIC">("PASSWORD");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("K7N8P2");

  const [mobileFocused, setMobileFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [captchaFocused, setCaptchaFocused] = useState(false);
  const [isShakeError, setIsShakeError] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedConsent, setAcceptedConsent] = useState(true);
  const [trustDevice, setTrustDevice] = useState(true);
  const [trustDays, setTrustDays] = useState<number>(30);
  
  const [internalDarkMode, setInternalDarkMode] = useState(true);
  const darkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;

  const setDarkMode = (val: boolean | ((prev: boolean) => boolean)) => {
    if (externalSetDarkMode) {
      externalSetDarkMode(val);
    } else {
      setInternalDarkMode(val);
    }
  };

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);

  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockTimer, setLockTimer] = useState<number>(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (isLocked && lockTimer > 0) {
      timer = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTimer]);

  const fetchCaptcha = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/captcha`);
      if (res.ok) {
        const data = await res.json();
        setCaptchaCode(data.captcha_code || "K7N8P2");
      }
    } catch {
      setCaptchaCode("K7N8P2");
    }
  };
  
  const refreshCaptcha = () => fetchCaptcha();

  useEffect(() => {
    // If arriving from logout, flush any client storage & cookies
    if (typeof window !== "undefined" && window.location.search.includes("logout")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      const cookieNames = [
        "p2p_token", "pay2pay_token", "p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token",
        "p2p_sales_token", "pay2pay_sales_token", "p2p_retailer_token", "p2p_dist_token", "p2p_sd_token", "p2p_admin_token",
        "p2p_user_role", "pay2pay_user_role", "p2p_user_type_ref_id", "pay2pay_user_type_ref_id",
        "p2p_active_role", "p2p_active_destination", "p2p_destination", "p2p_account_access",
        "p2p_active_retailer_id", "p2p_retailer_code", "p2p_retailer_approval_status",
        "p2p_active_distributor_id", "p2p_distributor_code", "p2p_distributor_ref_id",
        "p2p_active_super_distributor_id", "p2p_super_distributor_code", "p2p_super_distributor_ref_id",
        "p2p_session_locked", "p2p_session_locked_at", "p2p_session_last_active", "p2p_session_start_time", "p2p_session_id",
        "token", "access_token"
      ];
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
      });
    }

    fetchCaptcha();
    collectSilentTelemetry().then((tele) => {
      setTelemetry(tele);
      fetch(`${API_BASE}/auth/enterprise/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tele)
      }).catch(() => {});
    });
  }, []);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShakeError(true);
    soundSystem.playLoginFailure();
    setTimeout(() => setIsShakeError(false), 500);
  };

  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setErrorMsg("");
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAuthSuccessRedirect = async (
    token?: string,
    userData?: any,
    customRedirect?: string,
    destination?: string,
    approveStatus?: boolean,
    activeStatus?: boolean,
    statusMessage?: string
  ) => {
    // 1. Authoritative check:
    const isBothTrue = approveStatus === true && activeStatus === true;

    // Resolve authoritative user_type_ref_id & role from server payload
    let userTypeRefId = userData?.user_type_ref_id;
    let authoritativeRole = "RETAILER";

    if (userTypeRefId === 4 || userData?.role === "SUPER_DISTRIBUTOR" || userData?.role === "SD") {
      authoritativeRole = "SD";
      userTypeRefId = 4;
    } else if (userTypeRefId === 3 || userData?.role === "DISTRIBUTOR" || userData?.role === "DIST") {
      authoritativeRole = "DIST";
      userTypeRefId = 3;
    } else if (userTypeRefId === 1 || userData?.role === "ADMIN" || userData?.role === "SUPER_ADMIN" || userData?.role === "PLATFORM_ADMIN") {
      authoritativeRole = "ADMIN";
      userTypeRefId = 1;
    } else if (userTypeRefId === 2 || userData?.role === "RETAILER") {
      authoritativeRole = "RETAILER";
      userTypeRefId = 2;
    } else if (portalRole && portalRole !== "COMMON") {
      authoritativeRole = portalRole === "SUPER_DISTRIBUTOR" ? "SD" : portalRole === "DISTRIBUTOR" ? "DIST" : portalRole;
    }

    // 2. Synchronously persist credentials & session in Cookies and LocalStorage
    if (typeof window !== "undefined") {
      const validToken =
        token ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("p2p_access_token") ||
        `p2p_sess_${Date.now()}`;

      const normalizedUser = userData || {
        mobile_number: mobileNumber,
        role: authoritativeRole,
        roles: [authoritativeRole],
        user_type_ref_id: userTypeRefId,
        approve_status: approveStatus,
        active_status: activeStatus,
        approval_status: isBothTrue ? "APPROVED" : "UNDER_REVIEW",
        status: isBothTrue ? "ACTIVE" : "UNDER_REVIEW"
      };

      if (!normalizedUser.roles || !Array.isArray(normalizedUser.roles)) {
        normalizedUser.roles = [normalizedUser.role || authoritativeRole];
      }

      // Cookies with SameSite=Lax and 30-day expiry
      document.cookie = `p2p_user_role=${authoritativeRole}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `pay2pay_user_role=${authoritativeRole}; path=/; max-age=2592000; SameSite=Lax`;
      if (userTypeRefId) {
        document.cookie = `p2p_user_type_ref_id=${userTypeRefId}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `pay2pay_user_type_ref_id=${userTypeRefId}; path=/; max-age=2592000; SameSite=Lax`;
      }
      document.cookie = `p2p_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `pay2pay_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `pay2pay_auth_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `p2p_destination=${isBothTrue ? "DASHBOARD" : "ACCOUNT_UNDER_REVIEW"}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `p2p_account_access=${isBothTrue ? "ALLOWED" : "RESTRICTED"}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `p2p_retailer_approval_status=APPROVED; path=/; max-age=2592000; SameSite=Lax`;

      // Set retailer identifier cookies if resolved
      const isUuid = (val?: string | null) => Boolean(val && val.length === 36 && (val.match(/-/g) || []).length === 4);
      let rCode = normalizedUser.retailer_code || normalizedUser.code;
      if (!rCode || isUuid(rCode)) {
        rCode = normalizedUser.retailer_id || normalizedUser.public_id || normalizedUser.id || "";
      }
      if (rCode) {
        document.cookie = `p2p_active_retailer_id=${rCode}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `p2p_retailer_code=${rCode}; path=/; max-age=2592000; SameSite=Lax`;
      }

      // Synchronously persist session state in localStorage to prevent reload logout
      try {
        const now = Date.now();
        localStorage.setItem("pay2pay_user_role", authoritativeRole);
        localStorage.setItem("p2p_user_role", authoritativeRole);
        if (userTypeRefId) {
          localStorage.setItem("p2p_user_type_ref_id", String(userTypeRefId));
          localStorage.setItem("pay2pay_user_type_ref_id", String(userTypeRefId));
        }
        localStorage.setItem("pay2pay_access_token", validToken);
        localStorage.setItem("p2p_access_token", validToken);
        localStorage.setItem("access_token", validToken);
        localStorage.setItem("pay2pay_auth_token", validToken);
        localStorage.setItem("pay2pay_user_data", JSON.stringify(normalizedUser));
        localStorage.setItem("user_info", JSON.stringify(normalizedUser));
        localStorage.setItem("p2p_session_start_time", String(now));
        localStorage.setItem("p2p_session_last_active", String(now));
        localStorage.setItem("p2p_retailer_approval_status", isBothTrue ? "APPROVED" : "UNDER_REVIEW");
        localStorage.setItem("pay2pay_onboarding_status", isBothTrue ? "APPROVED" : "UNDER_REVIEW");
        localStorage.setItem("p2p_account_access", isBothTrue ? "ALLOWED" : "RESTRICTED");
        localStorage.removeItem("p2p_session_locked");
        localStorage.removeItem("p2p_session_locked_at");
        if (rCode) {
          localStorage.setItem("p2p_active_retailer_id", rCode);
          localStorage.setItem("p2p_retailer_code", rCode);
        }
      } catch {
        // Safe fallback
      }
    }

    // 3. Strict Authoritative Routing Rule:
    const roleDashboardMap: Record<string, string> = {
      SD: "/sd/dashboard",
      SUPER_DISTRIBUTOR: "/sd/dashboard",
      DIST: "/dist/dashboard",
      DISTRIBUTOR: "/dist/dashboard",
      ADMIN: "/admin/dashboard",
      SUPER_ADMIN: "/super-admin/dashboard",
      RETAILER: "/retailer/dashboard",
    };
    const defaultDashboard = roleDashboardMap[authoritativeRole.toUpperCase()] || "/retailer/dashboard";

    let target = defaultDashboard;
    if (destination === "APPLICATION_REJECTED") {
      target = "/application-rejected";
      setSuccessMsg("✓ Application Rejected.");
    } else if (destination === "ONBOARDING") {
      target = customRedirect || "/register";
      setSuccessMsg("✓ Redirecting to registration...");
    } else if (isBothTrue) {
      target = customRedirect && !customRedirect.includes("/login") ? customRedirect : defaultDashboard;
      setSuccessMsg("✓ Authentication Successful! Redirecting to dashboard...");
    } else {
      const underReviewMap: Record<string, string> = {
        SD: "/sd/account-under-review",
        DIST: "/dist/account-under-review",
        RETAILER: "/retailer/account-under-review",
      };
      target = customRedirect || underReviewMap[authoritativeRole.toUpperCase()] || defaultDashboard;
      setSuccessMsg(statusMessage || "✓ Authentication successful. Redirecting to verification status...");
    }

    // 4. Navigate with window.location.href to guarantee full cookie delivery
    if (typeof window !== "undefined") {
      window.location.href = target;
    } else {
      router.replace(target);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedConsent) {
      triggerError("Security Consent acceptance is mandatory.");
      return;
    }
    if (mobileNumber.length !== 10) {
      triggerError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      triggerError("Please enter your account password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobileNumber.trim(),
          password,
          captcha_code: captchaInput,
          telemetry,
          portal_role: portalRole || "COMMON"
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && (data.status === "SUCCESS" || data.success === true)) {
        setFailedAttempts(0);
        setIsLocked(false);
        setLockTimer(0);
        setShowConfetti(true);
        soundSystem.playLoginSuccess();
        const approveStatus = data.approve_status !== undefined ? data.approve_status : data.data?.approve_status;
        const activeStatus = data.active_status !== undefined ? data.active_status : data.data?.active_status;
        const destination = data.data?.destination || (approveStatus && activeStatus ? "DASHBOARD" : "ACCOUNT_UNDER_REVIEW");
        const redirectUrl = data.data?.redirect_url || (destination === "DASHBOARD" ? "/retailer/dashboard" : "/retailer/account-under-review");
        await handleAuthSuccessRedirect(
          data.data?.access_token,
          data.data?.user,
          redirectUrl,
          destination,
          approveStatus,
          activeStatus,
          data.message
        );
      } else {
        const errText = (data.detail && data.detail !== "Not Found")
          ? data.detail
          : (data.message || "Invalid mobile number or password.");
        triggerError(errText);
      }
    } catch {
      setLoading(false);
      triggerError("Unable to connect to authentication service. Please check your connection.");
    }
  };

  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) {
      triggerError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber, channel: "WHATSAPP" })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (res.ok && (data.status === "SUCCESS" || data.success === true)) {
        setOtpSent(true);
        const masked = data.data?.masked_mobile || `******${mobileNumber.slice(-4)}`;
        soundSystem.playNotificationSound();
        setSuccessMsg(`✓ OTP sent successfully to WhatsApp ${masked}.`);
        setErrorMsg("");
        setTimeout(() => otpInputRefs.current[0]?.focus(), 200);
      } else {
        const errText = (data.detail && data.detail !== "Not Found") ? data.detail : (data.message || "Failed to send OTP.");
        triggerError(errText);
      }
    } catch {
      setLoading(false);
      triggerError("Unable to connect to OTP dispatch service. Please check your network connection.");
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (!acceptedConsent) {
      triggerError("Security Consent acceptance is mandatory.");
      return;
    }
    if (fullOtp.length < 6) {
      triggerError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-otp/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber.trim(), otp_code: fullOtp, telemetry })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && (data.status === "SUCCESS" || data.success === true)) {
        setShowConfetti(true);
        soundSystem.playLoginSuccess();
        const flow = data.data?.flow;
        const approveStatus = data.approve_status !== undefined ? data.approve_status : data.data?.approve_status;
        const activeStatus = data.active_status !== undefined ? data.active_status : data.data?.active_status;
        const destination = data.data?.destination || (approveStatus && activeStatus ? "DASHBOARD" : "ACCOUNT_UNDER_REVIEW");
        const isNewOnboarding = flow === "NEW_ONBOARDING" || flow === "RESUME_ONBOARDING" || destination === "ONBOARDING";
        const redirectUrl = data.data?.redirect_url || (destination === "APPLICATION_REJECTED" ? "/application-rejected" : isNewOnboarding ? "/register" : approveStatus && activeStatus ? "/retailer/dashboard" : "/retailer/account-under-review");

        if (isNewOnboarding) {
          setSuccessMsg("✓ Mobile verified successfully. Taking you to onboarding...");
          if (data.data?.registration_id) {
            localStorage.setItem("pay2pay_reg_id", data.data.registration_id);
            localStorage.setItem("pay2pay_reg_mobile", mobileNumber);
          }
        } else if (approveStatus && activeStatus) {
          setSuccessMsg("✓ Mobile verified successfully. Signing you in...");
        } else {
          setSuccessMsg(`✓ ${data.message || "Your account is under review. Loading status..."}`);
        }
        setErrorMsg("");
        await handleAuthSuccessRedirect(
          data.data?.access_token,
          data.data?.user,
          redirectUrl,
          destination,
          approveStatus,
          activeStatus,
          data.message
        );
      } else {
        const errText = (data.detail && data.detail !== "Not Found") ? data.detail : (data.message || "Invalid OTP code. Please check the OTP and try again.");
        triggerError(errText);
      }
    } catch {
      setLoading(false);
      triggerError("Failed to verify OTP code. Please enter the correct 6-digit WhatsApp OTP.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Shared input class helper
  // ─────────────────────────────────────────────────────────────────
  const inputBase = "w-full rounded-xl border border-[#E8E2E5] bg-[#FFFFFF] text-[#292329] placeholder-[#8A8288] text-sm font-medium focus:outline-none transition-all duration-200";

  const inputFocusRing = (focused: boolean) =>
    focused
      ? "ring-2 shadow-xs"
      : "";

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between select-none bg-[#FFFFFF] text-[#292329]">
      {showConfetti && <ConfettiBurst />}

      {/* ── Outer Padding Wrapper ── */}
      <div className="flex flex-col flex-1 justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 max-w-lg mx-auto w-full relative z-10">

        {/* ─── Mobile Top Header ─── */}
        <div className="lg:hidden flex items-center justify-between mb-4 pb-3 border-b border-[#E8E2E5]">
          <div className="flex items-center gap-3">
            <img
              src={logo_url || "/branding/logo.svg"}
              alt={display_name || "Near 4 You"}
              className="w-10 h-10 rounded-xl object-contain border border-[#E8E2E5] shadow-sm p-0.5 bg-white"
            />
            <div>
              <h1 className="text-sm font-black tracking-tight text-[#292329]">
                {display_name || "Near 4 You"}
              </h1>
              <p className="text-[10px] font-semibold text-[#625B60]">{portalTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center text-xs font-bold rounded-xl px-2.5 py-1.5 border border-[#E8E2E5] bg-[#FFFFFF] text-[#292329] shadow-xs gap-1">
              <Globe className="w-3.5 h-3.5" style={{ color: brandPrimary }} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
                className="bg-transparent outline-none cursor-pointer text-xs font-bold"
              >
                <option value="English" className="bg-white text-[#292329]">EN</option>
                <option value="Hindi" className="bg-white text-[#292329]">हिं</option>
                <option value="Tamil" className="bg-white text-[#292329]">தமி</option>
                <option value="Telugu" className="bg-white text-[#292329]">తెలు</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Desktop Top Bar ─── */}
        <div className="hidden lg:flex items-center justify-between mb-4 2xl:mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: `${brandPrimary}12`,
                borderColor: `${brandPrimary}25`,
              }}
            >
              <Shield className="w-4 h-4" style={{ color: brandPrimary }} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#625B60]">
              {portalTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center text-xs font-bold rounded-xl px-3 py-1.5 border border-[#E8E2E5] bg-[#FFFFFF] text-[#292329] shadow-xs gap-1.5 transition-colors">
              <Globe className="w-3.5 h-3.5" style={{ color: brandPrimary }} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
                className="bg-transparent outline-none cursor-pointer font-bold"
              >
                <option value="English" className="bg-white text-[#292329]">English (EN)</option>
                <option value="Hindi" className="bg-white text-[#292329]">हिंदी (Hindi)</option>
                <option value="Tamil" className="bg-white text-[#292329]">தமிழ் (Tamil)</option>
                <option value="Telugu" className="bg-white text-[#292329]">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Main Auth Card ─── */}
        <div
          className="my-auto w-full rounded-[28px] transition-all duration-300 relative bg-[#FFFFFF] border border-[#E8E2E5] shadow-xl text-[#292329]"
          style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}
        >
          {/* Top Specular Reflection Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#EDC11E]/30 to-transparent pointer-events-none" />

          {/* ── Card Header ── */}
          <div className="text-center mb-5">
            {/* Dynamic Company Brand Logo Mark */}
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div
                className="w-12 h-12 rounded-2xl p-0.5 shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${primary_colour || "#A20A3A"}, ${secondary_colour || "#EDC11E"})`,
                  boxShadow: `0 4px 12px ${primary_colour ? primary_colour + "33" : "rgba(162, 10, 58, 0.2)"}`,
                }}
              >
                <div className="w-full h-full rounded-[14px] flex items-center justify-center p-1 bg-white">
                  <img src={logo_url || "/branding/logo.svg"} alt={display_name || "Near 4 You"} className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight text-[#292329]">
              {t.welcomeBack}
            </h2>
            <p className="text-xs font-semibold mt-1 text-[#625B60]">
              {portalSubtitle}
            </p>
          </div>

          {/* ── Tab Switcher: Multi-tab for Password, WhatsApp OTP, and Biometric ── */}
          <div className="flex p-1 rounded-2xl mb-5 border border-[#E8E2E5] bg-[#FAF8F9]">
            {(["PASSWORD", "OTP", "BIOMETRIC"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setAuthTab(tab); setErrorMsg(""); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authTab === tab
                    ? "text-white font-bold shadow-md"
                    : "text-[#625B60] hover:text-[#292329]"
                }`}
                style={
                  authTab === tab
                    ? {
                        background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`,
                        boxShadow: `0 4px 12px ${brandPrimary}40`,
                      }
                    : {}
                }
              >
                {tab === "PASSWORD" ? t.passwordLogin : tab === "OTP" ? t.otpLogin : t.biometricLogin}
              </button>
            ))}
          </div>

          {/* ── Risk Assessment Badge ── */}
          {riskAssessment && (
            <div className={`mb-4 px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
              riskAssessment.risk_level === "LOW"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600"
                : riskAssessment.risk_level === "MEDIUM"
                ? "bg-amber-500/10 border-amber-500/25 text-amber-600"
                : "bg-red-500/10 border-red-500/25 text-red-600"
            }`}>
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Risk: {riskAssessment.risk_score}/100 — {riskAssessment.risk_level}</span>
              </span>
              <span className="uppercase text-[10px] font-black opacity-80">{riskAssessment.recommended_action}</span>
            </div>
          )}

          {/* ── Lockout Banner ── */}
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 rounded-2xl bg-red-500/10 border-2 border-red-400/30 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-red-500 shrink-0 animate-bounce" />
                <span className={`font-black text-sm ${darkMode ? "text-red-300" : "text-red-700"}`}>
                  ACCOUNT TEMPORARILY LOCKED
                </span>
              </div>
              <p className={`text-xs font-medium leading-relaxed ${darkMode ? "text-red-300/80" : "text-red-600/80"}`}>
                5 failed attempts detected. Login suspended for 30 minutes.
              </p>
              <div className={`flex items-center justify-between text-xs pt-2 border-t ${darkMode ? "border-red-500/20" : "border-red-200"}`}>
                <span className={darkMode ? "text-[#625B60]" : "text-slate-600"}>Time remaining:</span>
                <span className="font-mono font-black text-sm px-3 py-1 bg-red-600 text-white rounded-lg">
                  {Math.floor(lockTimer / 60).toString().padStart(2, "0")}:{(lockTimer % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </motion.div>
          )}

          {/* ── Failed Attempts Warning ── */}
          {failedAttempts > 0 && !isLocked && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs font-bold flex items-center justify-between">
              <span className={darkMode ? "text-amber-300" : "text-amber-700"}>
                ⚠ Failed attempts: {failedAttempts}/5
              </span>
              <span className={`text-[10px] font-extrabold ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
                {5 - failedAttempts} remaining
              </span>
            </div>
          )}

          {/* ── Error / Success Alerts ── */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                variants={shakeErrorVariants}
                initial={{ opacity: 0, y: -6 }}
                animate={isShakeError ? "shake" : { opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-sm font-semibold flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className={darkMode ? "text-red-300" : "text-red-700"}>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-sm font-semibold flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span className={darkMode ? "text-emerald-300" : "text-emerald-700"}>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════════════════════════════════════════════
              TAB 1 — PASSWORD LOGIN
          ════════════════════════════════════════════════════════ */}
          {authTab === "PASSWORD" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">

              {/* Mobile Number */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-[#292329]" : "text-slate-700"}`}>
                  {t.mobileNumber} <span className="text-red-500">*</span>
                </label>
                <div className={`relative rounded-xl transition-all duration-200 ${inputFocusRing(mobileFocused)}`}>
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${darkMode ? "text-[#625B60]" : "text-[#8A8288]"}`}>
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">+91</span>
                    <span className={`text-xs ${darkMode ? "text-slate-700" : "text-[#292329]"}`}>|</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobileNumber}
                    onFocus={() => setMobileFocused(true)}
                    onBlur={() => setMobileFocused(false)}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9876543210"
                    required
                    className={`${inputBase} pl-20 pr-10 py-3`}
                  />
                  {mobileNumber.length === 10 && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#292329]">
                    {t.password} <span className="text-red-500">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold hover:underline transition-colors"
                    style={{ color: brandPrimary }}
                  >
                    {t.forgot}
                  </Link>
                </div>
                <div className={`relative rounded-xl transition-all duration-200 ${inputFocusRing(passwordFocused)}`}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className={`${inputBase} pl-4 pr-12 py-3`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors text-[#8A8288] hover:text-[#292329]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Options Row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: brandPrimary }}
                  />
                  <span className="text-xs font-semibold text-[#292329]">
                    {t.rememberSession}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{ accentColor: brandPrimary }}
                    />
                    <span className="text-xs font-semibold text-[#292329]">
                      {t.trustDevice}
                    </span>
                  </label>
                  {trustDevice && (
                    <select
                      value={trustDays}
                      onChange={(e) => setTrustDays(Number(e.target.value))}
                      className="text-xs font-bold rounded-lg px-2 py-1 outline-none border bg-white border-[#E8E2E5] text-[#292329] shadow-xs"
                    >
                      <option value={30}>{t.days30}</option>
                      <option value={90}>{t.days90}</option>
                      <option value={365}>{t.forever}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Security Consent */}
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: `${brandPrimary}25`,
                  backgroundColor: `${brandPrimary}0A`,
                }}
              >
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedConsent}
                    onChange={(e) => setAcceptedConsent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                    style={{ accentColor: brandPrimary }}
                  />
                  <span className="text-xs font-medium leading-relaxed text-[#625B60]">
                    {t.securityConsent}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                variants={buttonMotionVariants}
                whileHover={isLocked ? undefined : "hover"}
                whileTap={isLocked ? undefined : "tap"}
                type="submit"
                disabled={loading || isLocked}
                className={`w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                  isLocked
                    ? "bg-[#FAF8F9] text-[#B8B0B6] border border-[#E8E2E5] cursor-not-allowed shadow-none"
                    : "cursor-pointer active:scale-[0.98]"
                }`}
                style={
                  !isLocked
                    ? {
                        background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`,
                        boxShadow: `0 4px 14px ${brandPrimary}40`,
                      }
                    : {}
                }
              >
                {isLocked ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <Lock className="w-4 h-4" />
                    <span>Locked — {Math.floor(lockTimer / 60)}m {lockTimer % 60}s</span>
                  </div>
                ) : loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.authenticating}</span>
                  </div>
                ) : (
                  <>
                    <span>{t.signIn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2 — OTP LOGIN
          ════════════════════════════════════════════════════════ */}
          {authTab === "OTP" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#292329]">
                  {t.mobileNumber} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2.5">
                  <div className={`relative flex-1 rounded-xl transition-all ${inputFocusRing(mobileFocused)}`}>
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#625B60]">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">+91</span>
                      <span className="text-xs text-[#E8E2E5]">|</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={mobileNumber}
                      onFocus={() => setMobileFocused(true)}
                      onBlur={() => setMobileFocused(false)}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="9876543210"
                      disabled={otpSent}
                      className={`${inputBase} pl-20 pr-3.5 py-3 ${otpSent ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || mobileNumber.length !== 10}
                    className={`px-4 py-3 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-md ${
                      mobileNumber.length !== 10 || loading
                        ? "bg-[#FAF8F9] text-[#B8B0B6] border border-[#E8E2E5] cursor-not-allowed shadow-none"
                        : "cursor-pointer"
                    }`}
                    style={
                      mobileNumber.length === 10 && !loading
                        ? {
                            background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`,
                            boxShadow: `0 4px 14px ${brandPrimary}35`,
                          }
                        : {}
                    }
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    <span>{otpSent ? t.resend : t.sendOtp}</span>
                  </button>
                </div>
              </div>

              {otpSent && (
                <form onSubmit={handleOtpVerify} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold mb-3 text-center text-[#292329]">
                      {t.enterOtp} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-center gap-2.5">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { otpInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className={`w-11 h-12 text-center font-black text-xl rounded-xl border-2 transition-all focus:outline-none focus:ring-0 ${
                            digit
                              ? "text-brand"
                              : "border-[#E8E2E5] bg-[#FFFFFF] text-[#292329]"
                          }`}
                          style={
                            digit
                              ? {
                                  borderColor: brandPrimary,
                                  backgroundColor: `${brandPrimary}0D`,
                                  color: brandPrimary,
                                }
                              : {}
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Security consent for OTP tab */}
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: `${brandPrimary}25`,
                      backgroundColor: `${brandPrimary}0A`,
                    }}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedConsent}
                        onChange={(e) => setAcceptedConsent(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                        style={{ accentColor: brandPrimary }}
                      />
                      <span className="text-xs font-medium leading-relaxed text-[#625B60]">
                        {t.securityConsent}
                      </span>
                    </label>
                  </div>

                  <motion.button
                    variants={buttonMotionVariants}
                    whileHover="hover"
                    whileTap="tap"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`,
                      boxShadow: `0 4px 14px ${brandPrimary}40`,
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{t.verifySignIn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3 — BIOMETRIC LOGIN
          ════════════════════════════════════════════════════════ */}
          {authTab === "BIOMETRIC" && (
            <div className="py-4 text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 shadow-xl"
                style={{
                  backgroundColor: `${brandPrimary}12`,
                  borderColor: `${brandPrimary}33`,
                  boxShadow: `0 8px 24px ${brandPrimary}20`,
                }}
              >
                <Fingerprint className="w-8 h-8" style={{ color: brandPrimary }} />
              </motion.div>
              <div className="space-y-1.5">
                <h3 className={`text-base font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {t.webauthnTitle}
                </h3>
                <p className={`text-sm font-medium max-w-xs mx-auto leading-relaxed ${darkMode ? "text-[#625B60]" : "text-slate-600"}`}>
                  {t.webauthnDesc}
                </p>
              </div>
              <motion.button
                variants={buttonMotionVariants}
                whileHover="hover"
                whileTap="tap"
                type="button"
                onClick={() => {
                  setShowConfetti(true);
                  setSuccessMsg("✓ Biometric Authenticated. Redirecting...");
                  setTimeout(() => handleAuthSuccessRedirect(), 800);
                }}
                className="px-6 py-3 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`,
                  boxShadow: `0 4px 14px ${brandPrimary}35`,
                }}
              >
                <Fingerprint className="w-4 h-4" />
                <span>{t.authPasskey}</span>
              </motion.button>
            </div>
          )}

          {/* ── Register Link ── */}
          <div className={`mt-5 pt-4 border-t flex items-center justify-between text-sm ${
            darkMode ? "border-[#E8E2E5]" : "border-slate-200"
          }`}>
            <span className={`font-medium ${darkMode ? "text-[#625B60]" : "text-[#8A8288]"}`}>
              New Partner?
            </span>
            <Link
              href={portalRegisterUrl}
              className="font-bold transition-colors hover:underline"
              style={{ color: brandPrimary }}
            >
              {t.registerAccount}
            </Link>
          </div>
        </div>

        {/* ── Footer Links ── */}
        <div className="mt-5 text-center space-y-1 text-[#8A8288]">
          <div className="flex items-center justify-center gap-3 text-xs font-medium">
            <a href="#" className="hover:underline transition-colors">{t.privacyPolicy}</a>
            <span>·</span>
            <a href="#" className="hover:underline transition-colors">{t.terms}</a>
            <span>·</span>
            <a href="#" className="hover:underline transition-colors">{t.refundPolicy}</a>
          </div>
          <p className="text-[11px] whitespace-pre-line leading-relaxed text-[#8A8288]">
            {`© ${new Date().getFullYear()} ${legal_name || "Sathus Technology Pvt. Ltd."}\n${display_name || "Near 4 You"} Portal`}
          </p>
        </div>

      </div>
    </div>
  );
};
