"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  Chip,
  Paper,
  Stack,
  CircularProgress,
  Divider,
} from "@mui/material";
import Link from "next/link";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TranslateIcon from "@mui/icons-material/Translate";
import ShieldIcon from "@mui/icons-material/Shield";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export type SupportedLanguage = "en" | "hi" | "ta" | "te" | "kn" | "mr" | "bn";

interface TranslationStrings {
  serviceDown: string;
  badge: string;
  subTitle: string;
  description: string;
  statusHeadline: string;
  estResumeLabel: string;
  estResumeValue: string;
  safeTitle: string;
  safeDesc: string;
  supportTitle: string;
  supportDesc: string;
  checkStatus: string;
  checking: string;
  backHome: string;
  languageLabel: string;
}

const TRANSLATIONS: Record<SupportedLanguage, TranslationStrings> = {
  en: {
    serviceDown: "DMT Service Temporarily Down",
    badge: "Scheduled Maintenance • Resumes Soon",
    subTitle: "System Upgrade in Progress",
    description:
      "We are currently performing essential banking network maintenance and gateway optimizations to enhance transaction stability and speed. Domestic Money Transfer (DMT) transactions are temporarily paused.",
    statusHeadline: "Maintenance Window Active",
    estResumeLabel: "Expected Resolution",
    estResumeValue: "Resuming Soon • High Priority",
    safeTitle: "Funds & Data Protected",
    safeDesc: "Your customer details, beneficiary accounts, and retailer wallet balances are 100% secure.",
    supportTitle: "Engineering Ops On Call",
    supportDesc: "Our automated monitoring and platform engineering teams are actively working on restoring this service.",
    checkStatus: "Check Service Status",
    checking: "Verifying Live Status...",
    backHome: "Back to Dashboard",
    languageLabel: "Language / भाषा / மொழி",
  },
  hi: {
    serviceDown: "डीएमटी सेवा अस्थायी रूप से बंद है",
    badge: "निर्धारित रखरखाव • जल्द पुनः शुरू होगा",
    subTitle: "सिस्टम अपग्रेड प्रगति पर है",
    description:
      "लेन-देन की स्थिरता और सुरक्षा बढ़ाने के लिए वर्तमान में आवश्यक बैंकिंग नेटवर्क रखरखाव और गेटवे अनुकूलन किया जा रहा है। घरेलू मनी ट्रांसफर (DMT) सेवाएं अस्थायी रूप से रोक दी गई हैं।",
    statusHeadline: "रखरखाव विंडो सक्रिय",
    estResumeLabel: "अपेक्षित बहाली",
    estResumeValue: "जल्द पुनः शुरू होगा • उच्च प्राथमिकता",
    safeTitle: "धन एवं डेटा पूरी तरह सुरक्षित",
    safeDesc: "आपके ग्राहक विवरण, लाभार्थी बैंक खाते और रिटेलर वॉलेट शेष पूरी तरह सुरक्षित हैं।",
    supportTitle: "तकनीकी टीम सक्रिय है",
    supportDesc: "हमारी इंजीनियरिंग टीम इस सेवा को तुरंत बहाल करने के लिए सक्रिय रूप से काम कर रही है।",
    checkStatus: "सेवा स्थिति जांचें",
    checking: "स्थिति जांची जा रही है...",
    backHome: "डैशबोर्ड पर लौटें",
    languageLabel: "भाषा / Language",
  },
  ta: {
    serviceDown: "டிஎம்டி சேவை தற்காலிகமாக நிறுத்தப்பட்டுள்ளது",
    badge: "திட்டமிடப்பட்ட பராமரிப்பு • விரைவில் தொடங்கும்",
    subTitle: "கணினி மேம்படுத்தல் நடைபெறுகிறது",
    description:
      "பரிவர்த்தனை நிலைத்தன்மை மற்றும் வேகத்தை அதிகரிக்க வங்கி நெட்வொர்க் பராமரிப்பு பணிகள் நடைபெற்று வருகின்றன. உள்நாட்டு பணப்பரிமாற்ற (DMT) பரிவர்த்தனைகள் தற்காலிகமாக நிறுத்தப்பட்டுள்ளன.",
    statusHeadline: "பராமரிப்பு பணி செயலில் உள்ளது",
    estResumeLabel: "எதிர்பார்க்கப்படும் நேரம்",
    estResumeValue: "விரைவில் தொடங்கும் • உயர் முன்னுரிமை",
    safeTitle: "நிதி & தரவு 100% பாதுகாப்பானது",
    safeDesc: "உங்கள் வாடிக்கையாளர் விவரங்கள், வங்கி கணக்குகள் மற்றும் வாலட் இருப்பு முழுமையாகப் பாதுகாப்பாக உள்ளன.",
    supportTitle: "பொறியியல் குழு கண்காணிப்பில் உள்ளது",
    supportDesc: "சேவையை விரைவில் மீட்டமைக்க எங்கள் தொழில்நுட்பக் குழு முனைப்புடன் செயல்பட்டு வருகிறது.",
    checkStatus: "சேவை நிலையை சரிபார்க்கவும்",
    checking: "சரிபார்க்கப்படுகிறது...",
    backHome: "டாஷ்போர்டுக்கு திரும்புக",
    languageLabel: "மொழி / Language",
  },
  te: {
    serviceDown: "డిఎంటీ సేవ తాత్కాలికంగా నిలిపివేయబడింది",
    badge: "షెడ్యూల్డ్ నిర్వహణ • త్వరలో ప్రారంభం",
    subTitle: "సిస్టమ్ అప్‌గ్రేడ్ కొనసాగుతోంది",
    description:
      "లావాదేవీల స్థిరత్వం మరియు భద్రతను మెరుగుపరచడానికి బ్యాంకింగ్ నెట్‌వర్క్ నిర్వహణ జరుగుతోంది. దేశీయ నగదు బదిలీ (DMT) లావాదేవీలు తాత్కాలికంగా నిలిపివేయబడ్డాయి.",
    statusHeadline: "నిర్వహణ సమయం చురుకుగా ఉంది",
    estResumeLabel: "అంచనా సమయం",
    estResumeValue: "త్వరలో పునఃప్రారంభం • అత్యధిక ప్రాధాన్యత",
    safeTitle: "నిధులు & డేటా పూర్తిగా సురక్షితం",
    safeDesc: "మీ కస్టమర్ వివరాలు, లబ్ధిదారుల ఖాతాలు మరియు వాలెట్ బ్యాలెన్స్ 100% సురక్షితంగా ఉన్నాయి.",
    supportTitle: "సాంకేతిక బృందం పని చేస్తోంది",
    supportDesc: "ఈ సేవను వీలైనంత త్వరగా పునరుద్ధరించడానికి మా ఇంజనీరింగ్ బృందం చురుకుగా పనిచేస్తోంది.",
    checkStatus: "సేవ స్థితిని తనిఖీ చేయండి",
    checking: "పరిశీలిస్తోంది...",
    backHome: "డాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి",
    languageLabel: "భాష / Language",
  },
  kn: {
    serviceDown: "ಡಿಎಂಟ್ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಸ್ಥಗಿತಗೊಂಡಿದೆ",
    badge: "ನಿಗದಿತ ನಿರ್ವಹಣೆ • ಶೀಘ್ರದಲ್ಲೇ ಪುನರಾರಂಭ",
    subTitle: "ಸಿಸ್ಟಮ್ ನವೀಕರಣ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    description:
      "ವಹಿವಾಟಿನ ಸ್ಥಿರತೆ ಮತ್ತು ಭದ್ರತೆಯನ್ನು ಹೆಚ್ಚಿಸಲು ಬ್ಯಾಂಕಿಂಗ್ ನೆಟ್‌ವರ್ಕ್ ನಿರ್ವಹಣೆಯನ್ನು ಕೈಗೊಳ್ಳಲಾಗುತ್ತಿದೆ. ದೇಶೀಯ ಹಣ ವರ್ಗಾವಣೆ (DMT) ಸೇವೆಗಳನ್ನು ತಾತ್ಕಾಲಿಕವಾಗಿ ಸ್ಥಗಿತಗೊಳಿಸಲಾಗಿದೆ.",
    statusHeadline: "ನಿರ್ವಹಣಾ ಪ್ರಕ್ರಿಯೆ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    estResumeLabel: "ನಿರೀಕ್ಷಿತ ಮರುಸ್ಥಾಪನೆ",
    estResumeValue: "ಶೀಘ್ರದಲ್ಲೇ ಪುನರಾರಂಭ • ಉನ್ನತ ಆದ್ಯತೆ",
    safeTitle: "ನಿಧಿ ಮತ್ತು ಮಾಹಿತಿ 100% ಸುರಕ್ಷಿತ",
    safeDesc: "ನಿಮ್ಮ ಗ್ರಾಹಕರ ವಿವರಗಳು, ಫಲಾನುಭವಿಗಳ ಖಾತೆಗಳು ಮತ್ತು ವ್ಯಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್ ಸಂಪೂರ್ಣವಾಗಿ ಸುರಕ್ಷಿತವಾಗಿವೆ.",
    supportTitle: "ತಾಂತ್ರಿಕ ತಂಡ ಕರ್ತವ್ಯದಲ್ಲಿದೆ",
    supportDesc: "ಈ ಸೇವೆಯನ್ನು ಶೀಘ್ರವಾಗಿ ಮರುಸ್ಥಾಪಿಸಲು ನಮ್ಮ ಎಂಜಿನಿಯರಿಂಗ್ ತಂಡ ಸಕ್ರಿಯವಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ.",
    checkStatus: "ಸೇವಾ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ",
    checking: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    backHome: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    languageLabel: "ಭಾಷೆ / Language",
  },
  mr: {
    serviceDown: "डीएमटी सेवा तात्पुरती बंद आहे",
    badge: "नियोजित देखभाल • लवकरच पुन्हा सुरू होईल",
    subTitle: "प्रणाली अपग्रेड सुरू आहे",
    description:
      "व्यवहारांची सुरक्षितता आणि गती वाढवण्यासाठी सध्या बँकिंग नेटवर्कची देखभाल सुरू आहे. डोमेस्टिक मनी ट्रान्सफर (DMT) व्यवहार तात्पुरते स्थगित करण्यात आले आहेत.",
    statusHeadline: "देखभाल कार्य सक्रिय",
    estResumeLabel: "अपेक्षित वेळ",
    estResumeValue: "लवकरच पुन्हा सुरू होईल • उच्च प्राथमिकता",
    safeTitle: "निधी व डेटा पूर्णपणे सुरक्षित",
    safeDesc: "तुमचे ग्राहक तपशील, लाभार्थी बँक खाती आणि वॉलेट शिल्लक १००% सुरक्षित आहेत.",
    supportTitle: "तांत्रिक टीम कार्यरत आहे",
    supportDesc: "सेवा पूर्ववत सुरू करण्यासाठी आमची तांत्रिक टीम सतत काम करत आहे.",
    checkStatus: "सेवा स्थिती तपासा",
    checking: "तपासणी सुरू आहे...",
    backHome: "डॅशबोर्डवर परत जा",
    languageLabel: "भाषा / Language",
  },
  bn: {
    serviceDown: "ডিএমটি পরিষেবা সাময়িকভাবে বন্ধ রয়েছে",
    badge: "নির্ধারিত রক্ষণাবেক্ষণ • শীঘ্রই পুনরায় চালু হবে",
    subTitle: "সিস্টেম আপগ্রেড চলছে",
    description:
      "লেনদেনের স্থায়িত্ব ও নিরাপত্তা বাড়াতে ব্যাংকিং নেটওয়ার্ক রক্ষণাবেক্ষণ চলছে। ডোমেস্টিক মানি ট্রান্সফার (DMT) পরিষেবা সাময়িকভাবে স্থগিত রয়েছে।",
    statusHeadline: "রক্ষণাবেক্ষণ প্রক্রিয়া সক্রিয়",
    estResumeLabel: "প্রত্যাশিত সমাপ্তি",
    estResumeValue: "শীঘ্রই পুনরায় চালু হবে • উচ্চ অগ্রাধিকার",
    safeTitle: "তহবিল এবং তথ্য সম্পূর্ণ নিরাপদ",
    safeDesc: "আপনার গ্রাহকের বিবরণ, সুবিধাভোগী ব্যাংক অ্যাকাউন্ট এবং ওয়ালেট ব্যালেন্স সম্পূর্ণ নিরাপদ।",
    supportTitle: "প্রকৌশল দল সচেষ্ট",
    supportDesc: "এই পরিষেবাটি দ্রুত পুনরায় চালু করার জন্য আমাদের কারিগরি দল সচেষ্ট রয়েছে।",
    checkStatus: "পরিষেবার অবস্থা পরীক্ষা করুন",
    checking: "যাচাই করা হচ্ছে...",
    backHome: "ড্যাশবোর্ডে ফিরে যান",
    languageLabel: "ভাষা / Language",
  },
};

const LANGUAGES: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];

interface ServiceDownMaintenanceProps {
  service?: string;
  onRetry?: () => Promise<void> | void;
}

export const ServiceDownMaintenance: React.FC<ServiceDownMaintenanceProps> = ({
  service = "DMT",
  onRetry,
}) => {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>("en");
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const handleCheckStatus = async () => {
    if (!onRetry) return;
    setIsChecking(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 700);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3, md: 4 },
        position: "relative",
      }}
    >
      {/* ── CARD CONTAINER ── */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "880px",
          bgcolor: "#0A0F1D",
          borderRadius: 3,
          border: "1px solid rgba(234, 179, 8, 0.28)",
          boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(234, 179, 8, 0.12)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* TOP BRAND HEADER (Single Line / Responsive) */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 2,
            bgcolor: "rgba(15, 23, 42, 0.85)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {/* Left: Company Logo + Company Name */}
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                p: 0.5,
                border: "1px solid rgba(234, 179, 8, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(234, 179, 8, 0.2)",
              }}
            >
              <Box
                component="img"
                src="/branding/pay2pay-logo.png"
                alt="PAY2PAY"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
                onError={(e: any) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "18px", sm: "20px" },
                  color: "#F8FAFC",
                  letterSpacing: "0.5px",
                  lineHeight: 1.1,
                }}
              >
                PAY2PAY
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#94A3B8",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.2px",
                }}
              >
                Enterprise Banking Operations
              </Typography>
            </Box>
          </Stack>

          {/* Right: Language Translator Selector */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: "8px",
                px: 1.5,
                py: 0.5,
              }}
            >
              <TranslateIcon sx={{ fontSize: 18, color: "#EAB308" }} />
              <Select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as SupportedLanguage)}
                size="small"
                variant="standard"
                disableUnderline
                sx={{
                  color: "#F8FAFC",
                  fontSize: "13px",
                  fontWeight: 600,
                  "& .MuiSelect-select": {
                    py: 0.25,
                    pr: "22px !important",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "#94A3B8",
                  },
                }}
              >
                {LANGUAGES.map((l) => (
                  <MenuItem
                    key={l.code}
                    value={l.code}
                    sx={{
                      fontSize: "13px",
                      fontWeight: 500,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <span>{l.label}</span>
                    <Typography component="span" sx={{ color: "#EAB308", fontSize: "12px", fontWeight: 700 }}>
                      {l.native}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>
        </Box>

        {/* ── MAIN CONTENT AREA WITH ANIMATION ── */}
        <Box sx={{ p: { xs: 3, sm: 4, md: 5 }, textAlign: "center" }}>
          {/* HIGH-TECH PULSING RADAR ANIMATION */}
          <Box
            sx={{
              position: "relative",
              width: 140,
              height: 140,
              mx: "auto",
              mb: 3.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Outer radar pulse 1 */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid rgba(234, 179, 8, 0.35)",
                animation: "pulseRing 2.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
                "@keyframes pulseRing": {
                  "0%": { transform: "scale(0.85)", opacity: 0.9 },
                  "50%": { transform: "scale(1.35)", opacity: 0.2 },
                  "100%": { transform: "scale(1.75)", opacity: 0 },
                },
              }}
            />

            {/* Outer radar pulse 2 (staggered) */}
            <Box
              sx={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                border: "1.5px dashed rgba(245, 158, 11, 0.4)",
                animation: "spinSlow 14s linear infinite",
                "@keyframes spinSlow": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />

            {/* Glowing Core Sphere */}
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                bgcolor: "radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, rgba(15, 23, 42, 0.95) 75%)",
                border: "2px solid #EAB308",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 35px rgba(234, 179, 8, 0.5), inset 0 0 20px rgba(234, 179, 8, 0.25)",
              }}
            >
              <BuildCircleIcon
                sx={{
                  fontSize: 46,
                  color: "#FACC15",
                  animation: "gearWobble 4s ease-in-out infinite",
                  "@keyframes gearWobble": {
                    "0%, 100%": { transform: "rotate(0deg) scale(1)" },
                    "50%": { transform: "rotate(15deg) scale(1.05)" },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Service Downtime Status Chip */}
          <Chip
            icon={<WarningAmberIcon sx={{ fontSize: 16, color: "#EAB308 !important" }} />}
            label={t.badge}
            sx={{
              bgcolor: "rgba(234, 179, 8, 0.12)",
              color: "#FACC15",
              border: "1px solid rgba(234, 179, 8, 0.35)",
              fontWeight: 700,
              fontSize: { xs: "12px", sm: "13px" },
              px: 1,
              py: 2,
              borderRadius: "20px",
              mb: 2,
            }}
          />

          {/* Main Headline (Multi-Language) */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "22px", sm: "28px", md: "32px" },
              color: "#FFFFFF",
              letterSpacing: "-0.5px",
              mb: 1.5,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {t.serviceDown}
          </Typography>

          {/* Subtitle / Description (Multi-Language) */}
          <Typography
            sx={{
              color: "#94A3B8",
              fontSize: { xs: "13px", sm: "15px" },
              maxWidth: "680px",
              mx: "auto",
              lineHeight: 1.65,
              mb: 3.5,
            }}
          >
            {t.description}
          </Typography>

          {/* ── 3 TELEMETRY CARDS (Status, Security, Support) ── */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 4, textAlign: "left" }}
          >
            {/* Card 1: Estimated Resolution */}
            <Box
              sx={{
                flex: 1,
                p: 2.25,
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 2,
                transition: "border-color 0.2s ease",
                "&:hover": { borderColor: "rgba(234, 179, 8, 0.3)" },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 20, color: "#EAB308" }} />
                <Typography sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "14px" }}>
                  {t.estResumeLabel}
                </Typography>
              </Stack>
              <Typography sx={{ color: "#FACC15", fontWeight: 600, fontSize: "13px", mb: 0.5 }}>
                {t.estResumeValue}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontSize: "12px" }}>
                {t.statusHeadline}
              </Typography>
            </Box>

            {/* Card 2: 100% Safe */}
            <Box
              sx={{
                flex: 1,
                p: 2.25,
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 2,
                transition: "border-color 0.2s ease",
                "&:hover": { borderColor: "rgba(34, 197, 94, 0.3)" },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <ShieldIcon sx={{ fontSize: 20, color: "#22C55E" }} />
                <Typography sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "14px" }}>
                  {t.safeTitle}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontSize: "12px", lineHeight: 1.5 }}>
                {t.safeDesc}
              </Typography>
            </Box>

            {/* Card 3: Support */}
            <Box
              sx={{
                flex: 1,
                p: 2.25,
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 2,
                transition: "border-color 0.2s ease",
                "&:hover": { borderColor: "rgba(59, 130, 246, 0.3)" },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 20, color: "#3B82F6" }} />
                <Typography sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "14px" }}>
                  {t.supportTitle}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontSize: "12px", lineHeight: 1.5 }}>
                {t.supportDesc}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 3.5 }} />

          {/* ACTION BUTTONS */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            {/* Live Check Button */}
            <Button
              variant="contained"
              onClick={handleCheckStatus}
              disabled={isChecking}
              startIcon={
                isChecking ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <RefreshIcon
                    sx={{
                      animation: isChecking ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                )
              }
              sx={{
                bgcolor: "#EAB308",
                color: "#0F172A",
                fontWeight: 800,
                fontSize: "14px",
                px: 3.5,
                py: 1.25,
                borderRadius: "10px",
                textTransform: "none",
                boxShadow: "0 4px 15px rgba(234, 179, 8, 0.4)",
                "&:hover": {
                  bgcolor: "#CA8A04",
                  boxShadow: "0 6px 20px rgba(234, 179, 8, 0.6)",
                },
                minWidth: { xs: "100%", sm: "240px" },
              }}
            >
              {isChecking ? t.checking : t.checkStatus}
            </Button>

            {/* Back to Dashboard */}
            <Button
              component={Link}
              href="/retailer/dashboard"
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#E2E8F0",
                fontWeight: 600,
                fontSize: "14px",
                px: 3,
                py: 1.25,
                borderRadius: "10px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                },
                minWidth: { xs: "100%", sm: "190px" },
              }}
            >
              {t.backHome}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
