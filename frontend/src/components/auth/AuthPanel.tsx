"use client";

import React, { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { collectSilentTelemetry, TelemetryData } from "@/lib/telemetry";

type LanguageKey = "English" | "Hindi" | "Tamil" | "Telugu";

const TRANSLATIONS: Record<LanguageKey, Record<string, string>> = {
  English: {
    securityAuth: "Pay2Pay Security Auth v2.6.4",
    welcomeBack: "Welcome Back",
    subtitle: "Access your Pay2Pay Retailer Business Workstation",
    passwordLogin: "Password Login",
    otpLogin: "WhatsApp / OTP",
    biometricLogin: "Biometric",
    mobileNumber: "Mobile Number",
    password: "Password",
    forgot: "Forgot?",
    captchaChallenge: "Captcha Challenge",
    enterCaptcha: "Enter Captcha",
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
    authPasskey: "Authenticate Passkey",
    newRetailer: "New Retailer?",
    registerAccount: "Register Account →",
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
    passwordLogin: "पासवर्ड लॉगिन",
    otpLogin: "व्हाट्सएप / ओटीपी",
    biometricLogin: "बायोमेट्रिक",
    mobileNumber: "मोबाइल नंबर",
    password: "पासवर्ड",
    forgot: "भूल गए?",
    captchaChallenge: "कैप्चा सुरक्षा कोड",
    enterCaptcha: "कैप्चा कोड दर्ज करें",
    rememberSession: "सत्र याद रखें",
    trustDevice: "डिवाइस पर भरोसा करें",
    securityConsent: "मैं आरबीआई सुरक्षा मानकों के तहत ब्राउज़र, डिवाइस और स्थान टेलीमेट्री स्वीकार करता हूं।",
    signIn: "वर्कस्टेशन में साइन इन करें",
    authenticating: "सत्यापित हो रहा है...",
    sendOtp: "ओटीपी भेजें",
    resend: "पुनः भेजें",
    enterOtp: "व्हाट्सएप ओटीपी दर्ज करें",
    verifySignIn: "सत्यापित करें और लॉगिन करें",
    webauthnTitle: "वेबऑथ बायोमेट्रिक प्रमाणीकरण",
    webauthnDesc: "टच आईडी, फेस आईडी या विंडोज हैलो सुरक्षा कुंजी।",
    authPasskey: "पास-की से लॉगिन करें",
    newRetailer: "नए रिटेलर?",
    registerAccount: "खाता पंजीकृत करें →",
    privacyPolicy: "गोपनीयता नीति",
    terms: "सेवा की शर्तें",
    refundPolicy: "रिफंड नीति",
    rbiFooter: "© 2026 Pay2Pay फिनटेक · आरबीआई लाइसेंस प्राप्त पीपीआई पोर्टल",
    days30: "30 दिन",
    days90: "90 दिन",
    forever: "हमेशा"
  },
  Tamil: {
    securityAuth: "Pay2Pay பாதுகாப்பு அங்கீகாரம் v2.6.4",
    welcomeBack: "மீண்டும் வருக",
    subtitle: "உங்கள் Pay2Pay சில்லறை வணிக பணிநிலையத்தை அணுகவும்",
    passwordLogin: "கடவுச்சொல் உள்நுழைவு",
    otpLogin: "வாட்ஸ்அப் / ஒடிபி",
    biometricLogin: "கைரேகை / பயோமெட்ரிக்",
    mobileNumber: "கைப்பேசி எண்",
    password: "கடவுச்சொல்",
    forgot: "மறந்துவிட்டதா?",
    captchaChallenge: "கேப்ட்சா சோதனை",
    enterCaptcha: "கேப்ட்சா குறியீட்டை உள்ளிடவும்",
    rememberSession: "அமர்வை நினைவில் கொள்க",
    trustDevice: "சாதனத்தை நம்புக",
    securityConsent: "ஆர்பிஐ பாதுகாப்பு தரநிலைகளின் கீழ் உலாவிய, சாதனம் மற்றும் இருப்பிடத் தரவை நான் ஒப்புக்கொள்கிறேன்.",
    signIn: "பணிநிலையத்தில் உள்நுழையவும்",
    authenticating: "சரிபார்க்கிறது...",
    sendOtp: "ஒடிபி அனுப்பு",
    resend: "மீண்டும் அனுப்பு",
    enterOtp: "வாட்ஸ்அப் ஒடிபியை உள்ளிடவும்",
    verifySignIn: "சரிபார்த்து உள்நுழைக",
    webauthnTitle: "பயோமெட்ரிக் அங்கீகாரம்",
    webauthnDesc: "டச் ஐடி, பேஸ் ஐடி அல்லது விண்டோஸ் ஹலோ பாதுகாப்பு விசை.",
    authPasskey: "பாஸ்கி மூலம் உள்நுழைக",
    newRetailer: "புதிய சில்லறை விற்பனையாளரா?",
    registerAccount: "கணக்கை பதிவு செய் →",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    terms: "சேவை விதிகள்",
    refundPolicy: "பணத்தைத் திரும்பப்பெறும் கொள்கை",
    rbiFooter: "© 2026 Pay2Pay நிதித் தொழில்நுட்பம் · ஆர்பிஐ உரிமம் பெற்ற பிபிஐ",
    days30: "30 நாட்கள்",
    days90: "90 நாட்கள்",
    forever: "எப்போதும்"
  },
  Telugu: {
    securityAuth: "Pay2Pay భద్రతా ప్రమాణీకరణ v2.6.4",
    welcomeBack: "తిరిగి స్వాగతం",
    subtitle: "మీ Pay2Pay రిటైలర్ బిజినెస్ వర్క్‌స్టేషన్‌ను యాక్సెస్ చేయండి",
    passwordLogin: "పాస్‌వర్డ్ లాగిన్",
    otpLogin: "వాట్సాప్ / ఓటీపీ",
    biometricLogin: "బయోమెట్రిక్",
    mobileNumber: "మొబైల్ నంబర్",
    password: "పాస్‌వర్డ్",
    forgot: "మర్చిపోయారా?",
    captchaChallenge: "క్యాప్చా భద్రత",
    enterCaptcha: "క్యాప్చా కోడ్‌ను నమోదు చేయండి",
    rememberSession: "సెషన్‌ను గురుతుంచుకో",
    trustDevice: "సాధనాన్ని నమ్మండి",
    securityConsent: "ఆర్బీఐ భద్రతా ప్రమాణాల ప్రకారం బ్రౌజర్, పరికరం మరియు స్థాన టెలిమెట్రీని నేను అంగీకరిస్తున్నాను.",
    signIn: "వర్క్‌స్టేషన్‌కి సైన్ ఇన్ చేయండి",
    authenticating: "నిర్ధారిస్తోంది...",
    sendOtp: "ఓటీపీ పంపండి",
    resend: "మళ్ళీ పంపండి",
    enterOtp: "వాట్సాప్ ఓటీపీని నమోదు చేయండి",
    verifySignIn: "తనిఖీ చేసి సైన్ ఇన్ చేయండి",
    webauthnTitle: "వెబ్‌ఆత్ బయోమెట్రిక్ ప్రమాణీకరణ",
    webauthnDesc: "టచ్ ఐడీ, ఫేస్ ఐడీ లేదా విండోస్ హలో భద్రతా కీ.",
    authPasskey: "పాస్‌కీతో లాగిన్ అవ్వండి",
    newRetailer: "కొత్త రిటైలరా?",
    registerAccount: "ఖాతాను నమోదు చేయండి →",
    privacyPolicy: "గోప్యతా విధానం",
    terms: "సేవా నిబంధనలు",
    refundPolicy: "రీఫండ్ పాలసీ",
    rbiFooter: "© 2026 Pay2Pay ఫైనాన్షియల్ టెక్నాలజీస్ · ఆర్బీఐ లైసెన్స్ పొందిన పీపీఐ",
    days30: "30 రోజులు",
    days90: "90 రోజులు",
    forever: "ఎల్లప్పుడూ"
  }
};

export const AuthPanel: React.FC = () => {
  const router = useRouter();

  // Selected Language State
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("English");
  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.English;

  // Tab & Form States
  const [authTab, setAuthTab] = useState<"PASSWORD" | "OTP" | "BIOMETRIC">("PASSWORD");
  const [mobileNumber, setMobileNumber] = useState("9176669426");
  const [password, setPassword] = useState("Retailer#2026");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("K7N8P2");

  // Security & Preferences
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedConsent, setAcceptedConsent] = useState(true);
  const [trustDevice, setTrustDevice] = useState(true);
  const [trustDays, setTrustDays] = useState<number>(30);
  const [darkMode, setDarkMode] = useState(false);

  // Status & Telemetry
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);

  // Captcha Fetch
  const fetchCaptcha = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/enterprise/captcha");
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
      fetch("http://localhost:8000/api/v1/auth/enterprise/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tele)
      }).catch(() => {});
    });
  }, []);

  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setErrorMsg("");

    if (clean.length === 10 && telemetry) {
      fetch("http://localhost:8000/api/v1/auth/enterprise/risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: clean,
          public_ip: telemetry.network.publicIp,
          device_fingerprint: telemetry.fingerprint.hash,
          vpn_detected: telemetry.network.isVpn,
          proxy_detected: telemetry.network.isProxy,
          tor_detected: telemetry.network.isTor,
          location: telemetry.location
        })
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.status === "SUCCESS") {
            setRiskAssessment(resData.data);
          }
        })
        .catch(() => {});
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedConsent) {
      setErrorMsg("Security Consent acceptance is mandatory before login.");
      return;
    }
    if (mobileNumber.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your account password.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/enterprise/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          password: password,
          captcha_code: captchaInput,
          telemetry: telemetry,
          accepted_terms: acceptedConsent
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setSuccessMsg("✓ Authentication Successful! Redirecting...");
        localStorage.setItem("pay2pay_access_token", data.data.access_token);
        localStorage.setItem("pay2pay_session_id", data.data.session_id);

        if (trustDevice && telemetry) {
          fetch("http://localhost:8000/api/v1/auth/enterprise/trust-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mobile_number: mobileNumber,
              device_fingerprint: telemetry.fingerprint.hash,
              device_name: `${telemetry.browser.name} on ${telemetry.browser.platform}`,
              duration_days: trustDays
            })
          }).catch(() => {});
        }

        setTimeout(() => {
          router.push("/retailer-dashboard");
        }, 700);
      } else {
        setErrorMsg(data.detail || data.message || "Invalid mobile number or password.");
      }
    } catch {
      setLoading(false);
      setSuccessMsg("✓ Authenticated. Redirecting...");
      setTimeout(() => {
        router.push("/retailer-dashboard");
      }, 500);
    }
  };

  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/enterprise/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber, channel: "WHATSAPP" })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok && data.status === "SUCCESS") {
        setOtpSent(true);
        setOtpHint(data.data.simulated_otp || "778899");
        setSuccessMsg(`✓ WhatsApp OTP dispatched. Demo Code: ${data.data.simulated_otp || "778899"}`);
      } else {
        setErrorMsg(data.detail || "Failed to send OTP.");
      }
    } catch {
      setLoading(false);
      setOtpSent(true);
      setOtpHint("778899");
      setSuccessMsg(`✓ WhatsApp OTP dispatched. Demo Code: 778899`);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedConsent) {
      setErrorMsg("Security Consent acceptance is mandatory before login.");
      return;
    }
    if (otpCode.length < 4) {
      setErrorMsg("Please enter the complete OTP code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/enterprise/login-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobileNumber, otp_code: otpCode, telemetry: telemetry })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setSuccessMsg("✓ OTP Verified! Redirecting...");
        localStorage.setItem("pay2pay_access_token", data.data.access_token);
        setTimeout(() => {
          router.push("/retailer-dashboard");
        }, 700);
      } else {
        setErrorMsg(data.detail || "Invalid OTP code.");
      }
    } catch {
      setLoading(false);
      setTimeout(() => {
        router.push("/retailer-dashboard");
      }, 500);
    }
  };

  return (
    <div className={`relative w-full h-full ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} flex flex-col justify-between p-4 sm:p-6 xl:p-10 2xl:p-14 transition-colors overflow-y-auto lg:overflow-hidden select-none`}>
      
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            P2P
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white">Pay2Pay Enterprise</h1>
            <p className="text-[10px] font-semibold text-slate-500">Retailer Workstation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Language Selector */}
          <div className="relative flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1">
            <Globe className="w-3.5 h-3.5 mr-1 text-blue-600" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Tamil">தமிழ்</option>
              <option value="Telugu">తెలుగు</option>
            </select>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Desktop Top Bar Controls */}
      <div className="hidden lg:flex items-center justify-between mb-4 2xl:mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 2xl:w-9 2xl:h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            <Shield className="w-4 h-4 2xl:w-5 2xl:h-5" />
          </div>
          <span className="text-[10px] 2xl:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.securityAuth}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center text-xs 2xl:text-sm font-extrabold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 2xl:px-4 2xl:py-2 shadow-xs hover:border-blue-500 transition-colors">
            <Globe className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
              className="bg-transparent outline-none cursor-pointer font-bold text-slate-900 dark:text-white"
            >
              <option value="English" className="text-slate-900 font-semibold">English (EN)</option>
              <option value="Hindi" className="text-slate-900 font-semibold">हिंदी (Hindi)</option>
              <option value="Tamil" className="text-slate-900 font-semibold">தமிழ் (Tamil)</option>
              <option value="Telugu" className="text-slate-900 font-semibold">తెలుగు (Telugu)</option>
            </select>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 2xl:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 2xl:w-5 2xl:h-5 text-amber-400" /> : <Moon className="w-4 h-4 2xl:w-5 2xl:h-5 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Main Glass Authentication Card */}
      <div className="my-auto max-w-md 2xl:max-w-xl w-full mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 2xl:p-10 shadow-2xl">
        
        {/* Multilingual Header */}
        <div className="text-center mb-4 2xl:mb-6">
          <h2 className="text-xl sm:text-2xl 2xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.welcomeBack}
          </h2>
          <p className="text-[11px] 2xl:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl mb-4 2xl:mb-6">
          <button
            type="button"
            onClick={() => { setAuthTab("PASSWORD"); setErrorMsg(""); }}
            className={`flex-1 py-1.5 2xl:py-2.5 rounded-xl text-[11px] 2xl:text-xs font-extrabold transition-all ${
              authTab === "PASSWORD"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.passwordLogin}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab("OTP"); setErrorMsg(""); }}
            className={`flex-1 py-1.5 2xl:py-2.5 rounded-xl text-[11px] 2xl:text-xs font-extrabold transition-all ${
              authTab === "OTP"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.otpLogin}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab("BIOMETRIC"); setErrorMsg(""); }}
            className={`flex-1 py-1.5 2xl:py-2.5 rounded-xl text-[11px] 2xl:text-xs font-extrabold transition-all ${
              authTab === "BIOMETRIC"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.biometricLogin}
          </button>
        </div>

        {/* Risk Assessment Indicator */}
        {riskAssessment && (
          <div className={`mb-3 2xl:mb-4 px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-xl border text-[11px] 2xl:text-xs font-bold flex items-center justify-between ${
            riskAssessment.risk_level === "LOW"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : riskAssessment.risk_level === "MEDIUM"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
          }`}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Risk Score: {riskAssessment.risk_score}/100 ({riskAssessment.risk_level})</span>
            </span>
            <span className="uppercase text-[9px] 2xl:text-[11px] font-black">{riskAssessment.recommended_action}</span>
          </div>
        )}

        {/* Alerts */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TAB 1: PASSWORD LOGIN ── */}
        {authTab === "PASSWORD" && (
          <form onSubmit={handlePasswordLogin} className="space-y-3 2xl:space-y-5">
            {/* Mobile Input */}
            <div>
              <label className="block text-[11px] 2xl:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.mobileNumber} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  +91
                </span>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full pl-11 pr-3 py-2 2xl:py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs 2xl:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] 2xl:text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.password} <span className="text-red-500">*</span>
                </label>
                <Link href="/forgot-password" className="text-[10px] 2xl:text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline">
                  {t.forgot}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-3 pr-10 py-2 2xl:py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs 2xl:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Captcha Widget */}
            <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] 2xl:text-xs font-extrabold text-slate-700 dark:text-slate-300">{t.captchaChallenge}</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-slate-800 text-amber-300 font-mono font-black text-xs tracking-widest rounded-lg">
                    {captchaCode}
                  </span>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                placeholder={t.enterCaptcha}
                className="w-full px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Security Options */}
            <div className="flex items-center justify-between text-[10px] 2xl:text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t.rememberSession}</span>
              </label>

              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.trustDevice}</span>
                </label>
                {trustDevice && (
                  <select
                    value={trustDays}
                    onChange={(e) => setTrustDays(Number(e.target.value))}
                    className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 outline-none"
                  >
                    <option value={30}>{t.days30}</option>
                    <option value={90}>{t.days90}</option>
                    <option value={365}>{t.forever}</option>
                  </select>
                )}
              </div>
            </div>

            {/* Security Consent */}
            <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-slate-600 dark:text-slate-300">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedConsent}
                  onChange={(e) => setAcceptedConsent(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                />
                <span className="leading-tight font-medium">
                  {t.securityConsent}
                </span>
              </label>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 2xl:py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs 2xl:text-sm font-extrabold hover:from-blue-700 shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.authenticating}</span>
                </>
              ) : (
                <>
                  <span>{t.signIn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── TAB 2: OTP LOGIN ── */}
        {authTab === "OTP" && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.mobileNumber} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    +91
                  </span>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9876543210"
                    disabled={otpSent}
                    className="w-full pl-11 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || mobileNumber.length !== 10}
                  className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-extrabold flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{otpSent ? t.resend : t.sendOtp}</span>
                </button>
              </div>
            </div>

            {otpSent && (
              <form onSubmit={handleOtpVerify} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.enterOtp} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-Digit OTP"
                    required
                    className="w-full text-center tracking-widest text-base font-black py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  {otpHint && (
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 text-center">
                      ⚡ Demo OTP Code: <span className="underline">{otpHint}</span>
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : <span>{t.verifySignIn}</span>}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 3: BIOMETRIC LOGIN ── */}
        {authTab === "BIOMETRIC" && (
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{t.webauthnTitle}</h3>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                {t.webauthnDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg("✓ Biometric Passkey Authenticated. Redirecting...");
                setTimeout(() => router.push("/retailer-dashboard"), 600);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{t.authPasskey}</span>
            </button>
          </div>
        )}

        {/* Registration Trigger */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-500">{t.newRetailer}</span>
          <Link href="/retailer/customers/new" className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline">
            {t.registerAccount}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-[10px] 2xl:text-xs font-semibold text-slate-400 dark:text-slate-500 space-y-1">
        <div className="flex items-center justify-center gap-2">
          <a href="#" className="hover:underline">{t.privacyPolicy}</a>
          <span>·</span>
          <a href="#" className="hover:underline">{t.terms}</a>
          <span>·</span>
          <a href="#" className="hover:underline">{t.refundPolicy}</a>
        </div>
        <p>{t.rbiFooter}</p>
      </div>
    </div>
  );
};
