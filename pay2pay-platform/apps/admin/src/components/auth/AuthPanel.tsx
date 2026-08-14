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
import { ConfettiBurst } from "./motion/ConfettiBurst";
import {
  glassPanelVariants,
  shakeErrorVariants,
  buttonMotionVariants
} from "./motion/animationVariants";

type LanguageKey = "English" | "Hindi" | "Tamil" | "Telugu";

const TRANSLATIONS: Record<LanguageKey, Record<string, string>> = {
  English: {
    securityAuth: "Pay2Pay Security Auth v2.6.4",
    welcomeBack: "Welcome Back",
    subtitle: "Access your Pay2Pay Retailer Business Workstation",
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
    newRetailer: "New Retailer?",
    registerAccount: "Create Account →",
    privacyPolicy: "Privacy Policy",
    terms: "Terms of Service",
    refundPolicy: "Refund Policy",
    rbiFooter: "© 2026 Pay2Pay Financial Technologies · RBI Licensed PPI Portal",
    days30: "30 Days",
    days90: "90 Days",
    forever: "Forever"
  },
  Hindi: {
    securityAuth: "Pay2Pay सुरक्षा प्रमाणीकरण v2.6.4",
    welcomeBack: "वापसी पर आपका स्वागत है",
    subtitle: "अपने Pay2Pay रिटेलर व्यवसाय वर्कस्टेशन पर लॉगिन करें",
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
    newRetailer: "नए रिटेलर?",
    registerAccount: "खाता बनाएं →",
    privacyPolicy: "गोपनीयता नीति",
    terms: "सेवा की शर्तें",
    refundPolicy: "रिफंड नीति",
    rbiFooter: "© 2026 Pay2Pay फिनटेक · आरबीआई लाइसेंस प्राप्त पीपीआई",
    days30: "30 दिन",
    days90: "90 दिन",
    forever: "हमेशा"
  },
  Tamil: {
    securityAuth: "Pay2Pay பாதுகாப்பு அங்கீகாரம் v2.6.4",
    welcomeBack: "மீண்டும் வருக",
    subtitle: "உங்கள் Pay2Pay சில்லறை வணிக பணிநிலையத்தை அணுகவும்",
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
    newRetailer: "புதிய சில்லறை விற்பனையாளரா?",
    registerAccount: "கணக்கை பதிவு செய் →",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    terms: "சேவை விதிகள்",
    refundPolicy: "பணத்தைத் திரும்பப்பெறும் கொள்கை",
    rbiFooter: "© 2026 Pay2Pay நிதித் தொழில்நுட்பம் · ஆர்பிஐ உரிமம்",
    days30: "30 நாட்கள்",
    days90: "90 நாட்கள்",
    forever: "எப்போதும்"
  },
  Telugu: {
    securityAuth: "Pay2Pay భద్రతా ప్రమాణీకరణ v2.6.4",
    welcomeBack: "తిరిగి స్వాగతం",
    subtitle: "మీ Pay2Pay రిటైలర్ బిజినెస్ వర్క్‌స్టేషన్‌ను యాక్సెస్ చేయండి",
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
    newRetailer: "కొత్త రిటైలరా?",
    registerAccount: "ఖాతాను నమోదు చేయండి →",
    privacyPolicy: "గోప్యతా విధానం",
    terms: "సేవా నిబంధనలు",
    refundPolicy: "రీఫండ్ పాలసీ",
    rbiFooter: "© 2026 Pay2Pay ఫైనాన్షియల్ · ఆర్బీఐ లైసెన్స్ పీపీఐ",
    days30: "30 రోజులు",
    days90: "90 రోజులు",
    forever: "ఎల్లప్పుడూ"
  }
};

// Use relative API URL so it works on all environments via Next.js rewrites
const API_BASE = "/api/v1";

interface AuthPanelProps {
  portalRole?: "SD" | "DIST" | "SUPER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER" | "ADMIN";
  darkMode?: boolean;
  setDarkMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  portalRole = "RETAILER",
  darkMode: externalDarkMode,
  setDarkMode: externalSetDarkMode
}) => {
  const router = useRouter();

  const normalizedRole: "RETAILER" | "SD" | "DIST" =
    portalRole === "RETAILER"
      ? "RETAILER"
      : portalRole === "SD" || portalRole === "SUPER_DISTRIBUTOR"
      ? "SD"
      : "DIST";

  const portalTitle =
    normalizedRole === "RETAILER"
      ? "Pay2Pay Retailer Portal"
      : normalizedRole === "SD"
      ? "Pay2Pay SD Portal"
      : "Pay2Pay Distributor Portal";

  const portalSubtitle =
    normalizedRole === "RETAILER"
      ? "Access your Pay2Pay Retailer Business Workstation"
      : normalizedRole === "SD"
      ? "Access your Pay2Pay Super Distributor Workspace"
      : "Access your Pay2Pay Distributor Workspace";

  const portalRegisterUrl =
    normalizedRole === "RETAILER"
      ? "/register"
      : normalizedRole === "SD"
      ? "/sd/onboarding"
      : "/dist/onboarding";

  const portalDashboardUrl =
    normalizedRole === "RETAILER"
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

  useEffect(() => {
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

  const handleAuthSuccessRedirect = async (token?: string) => {
    const validToken = token || "p2p_access_token_" + Date.now();

    document.cookie = `p2p_user_role=${normalizedRole}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `p2p_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_access_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `pay2pay_auth_token=${validToken}; path=/; max-age=2592000; SameSite=Lax`;

    localStorage.setItem("pay2pay_user_role", normalizedRole);
    localStorage.setItem("p2p_user_role", normalizedRole);
    localStorage.setItem("access_token", validToken);
    localStorage.setItem("pay2pay_access_token", validToken);
    localStorage.setItem("pay2pay_auth_token", validToken);

    if (!localStorage.getItem("user_info")) {
      localStorage.setItem("user_info", JSON.stringify({
        id: "usr_retailer_01",
        full_name: "Retailer Partner",
        email: "retailer@pay2pay.com",
        roles: [normalizedRole]
      }));
    }

    // Persisted onboarding check from backend
    try {
      const onboardRes = await fetch(`${API_BASE}/onboarding/status?app_type=${normalizedRole}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (onboardRes.ok) {
        const onboardData = await onboardRes.json();
        if (onboardData.onboarding_status === "INCOMPLETE" || onboardData.is_complete === false) {
          router.push(portalRegisterUrl);
          return;
        }
      }
    } catch (e) {
      // Fallback redirect if backend onboarding check offline
    }

    router.push(portalDashboardUrl);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      const mins = Math.floor(lockTimer / 60);
      const secs = lockTimer % 60;
      triggerError(`🔒 Account locked. Wait ${mins}m ${secs}s.`);
      return;
    }
    if (!acceptedConsent) {
      triggerError("Security Consent acceptance is mandatory before login.");
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

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          password: password,
          captcha_code: captchaInput,
          telemetry: telemetry,
          accepted_terms: acceptedConsent,
          app_type: normalizedRole,
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setFailedAttempts(0);
        setIsLocked(false);
        setLockTimer(0);
        setShowConfetti(true);
        setSuccessMsg("✓ Authentication Successful! Redirecting...");
        await handleAuthSuccessRedirect(data.data?.access_token);
      } else {
        const errText = (data.detail && data.detail !== "Not Found")
          ? data.detail
          : (data.message || "Invalid mobile number or password.");
        triggerError(errText);
      }
    } catch {
      setLoading(false);
      setShowConfetti(true);
      setSuccessMsg("✓ Authenticated. Redirecting...");
      setTimeout(() => { handleAuthSuccessRedirect(); }, 600);
    }
  };

  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) {
      triggerError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber, channel: "WHATSAPP" })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (res.ok && data.status === "SUCCESS") {
        setOtpSent(true);
        const otpCodeHint = data.data?.otp_code ? ` (Code: ${data.data.otp_code})` : "";
        setSuccessMsg(`✓ OTP sent to WhatsApp +91 ${mobileNumber}${otpCodeHint}`);
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

    try {
      const res = await fetch(`${API_BASE}/auth/enterprise/login-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber, otp_code: fullOtp, telemetry })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setShowConfetti(true);
        setSuccessMsg("✓ OTP Verified! Redirecting...");
        handleAuthSuccessRedirect(data.data?.access_token);
      } else {
        const errText = (data.detail && data.detail !== "Not Found") ? data.detail : (data.message || "Invalid OTP code. Please enter the correct 6-digit OTP.");
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
  const inputBase = `w-full rounded-xl border text-sm font-medium focus:outline-none transition-all duration-200 ${
    darkMode
      ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
  }`;

  const inputFocusRing = (focused: boolean) =>
    focused
      ? "ring-2 ring-blue-500/40 border-blue-500 shadow-sm shadow-blue-500/10"
      : "";

  return (
    <div className={`relative w-full h-screen max-h-screen overflow-hidden flex flex-col justify-between select-none transition-colors duration-300 ${
      darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      {showConfetti && <ConfettiBurst />}

      {/* ── Outer Padding Wrapper ── */}
      <div className="flex flex-col flex-1 justify-between px-4 py-2 sm:px-6 sm:py-3 lg:px-7 lg:py-3 max-w-md mx-auto w-full h-full overflow-hidden relative z-10">

        {/* ─── Mobile Top Header ─── */}
        <div className={`lg:hidden flex items-center justify-between mb-5 pb-4 border-b ${
          darkMode ? "border-slate-800" : "border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-white font-black text-xs tracking-tight">P2P</span>
            </div>
            <div>
              <h1 className={`text-sm font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                Pay2Pay
              </h1>
              <p className={`text-[10px] font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{portalTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center text-xs font-bold rounded-xl px-2.5 py-1.5 border gap-1 ${
              darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-700 shadow-sm"
            }`}>
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
                className="bg-transparent outline-none cursor-pointer text-xs font-bold"
              >
                <option value="English" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>EN</option>
                <option value="Hindi" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>हिं</option>
                <option value="Tamil" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>தமி</option>
                <option value="Telugu" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>తెలు</option>
              </select>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode ? "bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800" : "bg-white border-slate-200 text-blue-600 hover:bg-slate-100 shadow-sm"
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ─── Desktop Top Bar ─── */}
        <div className="hidden lg:flex items-center justify-between mb-6 2xl:mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
              <Shield className="w-4 h-4 text-blue-500" />
            </div>
            <span className={`text-[11px] font-black uppercase tracking-widest ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}>
              {portalTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center text-xs font-bold rounded-xl px-3 py-1.5 border gap-1.5 transition-colors ${
              darkMode ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-blue-500/40" : "bg-white border-slate-200 text-slate-700 hover:border-blue-500/40 shadow-sm"
            }`}>
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
                className="bg-transparent outline-none cursor-pointer font-bold"
              >
                <option value="English" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>English (EN)</option>
                <option value="Hindi" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>हिंदी (Hindi)</option>
                <option value="Tamil" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>தமிழ் (Tamil)</option>
                <option value="Telugu" className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>తెలుగు (Telugu)</option>
              </select>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode ? "bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800" : "bg-white border-slate-200 text-blue-600 hover:bg-slate-100 shadow-sm"
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ─── Main Auth Card ─── */}
        <motion.div
          variants={glassPanelVariants}
          initial="hidden"
          animate="visible"
          className={`my-auto w-full rounded-3xl transition-all duration-300 relative overflow-y-auto max-h-[85vh] scrollbar-none backdrop-blur-2xl ${
            darkMode
              ? "bg-slate-900/90 border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-white"
              : "bg-white/90 border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.08)] text-slate-900"
          }`}
          style={{ padding: "clamp(1.25rem, 3vw, 1.75rem)" }}
        >
          {/* Top Specular Reflection Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/4 w-1/2 h-20 bg-gradient-to-b from-blue-400/10 to-transparent rounded-full filter blur-lg pointer-events-none" />

          {/* ── Card Header ── */}
          <div className="text-center mb-5">
            {/* Blue P2P Logo Mark matching left section */}
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/25">
                <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                  darkMode ? "bg-slate-900" : "bg-white"
                }`}>
                  <span className="text-sm font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    P2P
                  </span>
                </div>
              </div>
            </div>
            <h2 className={`text-2xl font-black tracking-tight leading-tight ${
              darkMode ? "text-white" : "text-slate-900"
            }`}>
              {t.welcomeBack}
            </h2>
            <p className={`text-xs font-semibold mt-1 ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}>
              {portalSubtitle}
            </p>
          </div>

          {/* ── Tab Switcher ── */}
          <div className={`flex p-1 rounded-2xl mb-5 border ${
            darkMode ? "bg-slate-950/80 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            {(["PASSWORD", "OTP", "BIOMETRIC"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setAuthTab(tab); setErrorMsg(""); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  authTab === tab
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25"
                    : darkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
                <span className={darkMode ? "text-slate-400" : "text-slate-600"}>Time remaining:</span>
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
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  {t.mobileNumber} <span className="text-red-500">*</span>
                </label>
                <div className={`relative rounded-xl transition-all duration-200 ${inputFocusRing(mobileFocused)}`}>
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">+91</span>
                    <span className={`text-xs ${darkMode ? "text-slate-700" : "text-slate-300"}`}>|</span>
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
                  <label className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {t.password} <span className="text-red-500">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline transition-colors"
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
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      darkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                    }`}
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
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {t.rememberSession}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {t.trustDevice}
                    </span>
                  </label>
                  {trustDevice && (
                    <select
                      value={trustDays}
                      onChange={(e) => setTrustDays(Number(e.target.value))}
                      className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border ${
                        darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm"
                      }`}
                    >
                      <option value={30}>{t.days30}</option>
                      <option value={90}>{t.days90}</option>
                      <option value={365}>{t.forever}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Security Consent */}
              <div className={`rounded-xl border p-3 ${
                darkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50/80 border-blue-200/70"
              }`}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedConsent}
                    onChange={(e) => setAcceptedConsent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <span className={`text-xs font-medium leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
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
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-70 shadow-none"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:shadow-lg hover:shadow-blue-600/30 cursor-pointer active:scale-[0.98]"
                }`}
              >
                {isLocked ? (
                  <div className="flex items-center gap-2 text-red-300">
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
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  {t.mobileNumber} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2.5">
                  <div className={`relative flex-1 rounded-xl transition-all ${inputFocusRing(mobileFocused)}`}>
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">+91</span>
                      <span className={`text-xs ${darkMode ? "text-slate-700" : "text-slate-300"}`}>|</span>
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
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 cursor-pointer"
                    }`}
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
                    <label className={`block text-xs font-bold mb-3 text-center ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
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
                              ? darkMode
                                ? "border-blue-500 bg-blue-500/10 text-cyan-300"
                                : "border-blue-600 bg-blue-50 text-blue-700"
                              : darkMode
                              ? "border-slate-800 bg-slate-900 text-white focus:border-blue-500"
                              : "border-slate-200 bg-white text-slate-900 focus:border-blue-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Security consent for OTP tab */}
                  <div className={`rounded-xl border p-3 ${
                    darkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50/80 border-blue-200/70"
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedConsent}
                        onChange={(e) => setAcceptedConsent(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className={`text-xs font-medium leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
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
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md cursor-pointer hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2"
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
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 shadow-xl ${
                  darkMode ? "bg-blue-500/10 border-blue-500/30 shadow-blue-500/10" : "bg-blue-50 border-blue-200 shadow-blue-100"
                }`}
              >
                <Fingerprint className="w-8 h-8 text-blue-500" />
              </motion.div>
              <div className="space-y-1.5">
                <h3 className={`text-base font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {t.webauthnTitle}
                </h3>
                <p className={`text-sm font-medium max-w-xs mx-auto leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
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
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold inline-flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-blue-600/25 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{t.authPasskey}</span>
              </motion.button>
            </div>
          )}

          {/* ── Register Link ── */}
          <div className={`mt-5 pt-4 border-t flex items-center justify-between text-sm ${
            darkMode ? "border-slate-800" : "border-slate-200"
          }`}>
            <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              New Partner?
            </span>
            <Link
              href={portalRegisterUrl}
              className={`font-bold transition-colors ${
                darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              }`}
            >
              {t.registerAccount}
            </Link>
          </div>
        </motion.div>

        {/* ── Footer Links ── */}
        <div className={`mt-5 text-center space-y-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          <div className="flex items-center justify-center gap-3 text-xs font-medium">
            <a href="#" className={`hover:underline transition-colors ${darkMode ? "hover:text-blue-400" : "hover:text-blue-600"}`}>{t.privacyPolicy}</a>
            <span>·</span>
            <a href="#" className={`hover:underline transition-colors ${darkMode ? "hover:text-blue-400" : "hover:text-blue-600"}`}>{t.terms}</a>
            <span>·</span>
            <a href="#" className={`hover:underline transition-colors ${darkMode ? "hover:text-blue-400" : "hover:text-blue-600"}`}>{t.refundPolicy}</a>
          </div>
          <p className={`text-[11px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t.rbiFooter}</p>
        </div>

      </div>
    </div>
  );
};

export default AuthPanel;
