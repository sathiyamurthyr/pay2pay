"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  RefreshCw,
  Edit3,
  Building,
  Hash,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";

interface Step7Props {
  registrationId: string;
  initialAadhaar?: string;
  onSuccess: (aadhaarData: any) => void;
  onBack?: () => void;
}

export const Step7Aadhaar: React.FC<Step7Props> = ({
  registrationId,
  initialAadhaar = "",
  onSuccess,
  onBack
}) => {
  const [aadhaarNumber, setAadhaarNumber] = useState(initialAadhaar || "");
  const [otpSent, setOtpSent] = useState(false);
  const [refId, setRefId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [receivedOtpNotice, setReceivedOtpNotice] = useState("");
  const [ekycResult, setEkycResult] = useState<any>(null);

  // Editable fields for Screen 3
  const [editableName, setEditableName] = useState("");
  const [editableDob, setEditableDob] = useState("");
  const [editableGender, setEditableGender] = useState("");
  const [editableStreet, setEditableStreet] = useState("");
  const [editableLocality, setEditableLocality] = useState("");
  const [editableCity, setEditableCity] = useState("");
  const [editableDistrict, setEditableDistrict] = useState("");
  const [editableState, setEditableState] = useState("");
  const [editablePincode, setEditablePincode] = useState("");
  const [editableCountry, setEditableCountry] = useState("INDIA");
  const [editableHouse, setEditableHouse] = useState("");
  const [editableLandmark, setEditableLandmark] = useState("");
  const [editableAltAddress, setEditableAltAddress] = useState("");
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
  const isValidAadhaar = cleanAadhaar.length === 12;

  const formatAadhaarInput = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    if (raw.length <= 4) return raw;
    if (raw.length <= 8) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    return `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8)}`;
  };

  const maskedAadhaarDisplay =
    cleanAadhaar.length >= 4
      ? `XXXXXXXX${cleanAadhaar.slice(-4)}`
      : "XXXXXXXXXXXX";

  const getPhotoSrc = (res: any) => {
    if (!res) return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200";
    const raw = res.photo || res.photo_url || res.photo_base64 || res.photo_avatar;
    if (!raw) return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200";
    if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }
    return `data:image/jpeg;base64,${raw}`;
  };

  const getVal = (res: any, keys: string[], defaultVal: string = "") => {
    if (!res) return defaultVal;
    for (const k of keys) {
      if (res[k] && typeof res[k] === "string" && res[k].trim() !== "") return res[k];
      if (res.aadhaar && res.aadhaar[k] && typeof res.aadhaar[k] === "string" && res.aadhaar[k].trim() !== "") return res.aadhaar[k];
      if (res.address && typeof res.address === "object" && res.address[k] && typeof res.address[k] === "string" && res.address[k].trim() !== "") return res.address[k];
      if (res.split_address && typeof res.split_address === "object" && res.split_address[k] && typeof res.split_address[k] === "string" && res.split_address[k].trim() !== "") return res.split_address[k];
      if (res.raw_response?.split_address && typeof res.raw_response.split_address === "object" && res.raw_response.split_address[k] && typeof res.raw_response.split_address[k] === "string" && res.raw_response.split_address[k].trim() !== "") return res.raw_response.split_address[k];
      if (res.raw_response && res.raw_response[k] && typeof res.raw_response[k] === "string" && res.raw_response[k].trim() !== "") return res.raw_response[k];
    }
    return defaultVal;
  };

  useEffect(() => {
    let timer: any;
    if (otpSent && !ekycResult && countdown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [otpSent, ekycResult, countdown]);

  useEffect(() => {
    if (otpSent && !ekycResult && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent, ekycResult]);

  const populateEditableFields = (data: any) => {
    setEditableName(getVal(data, ["full_name", "name"], ""));
    setEditableDob(getVal(data, ["dob", "date_of_birth"], ""));
    setEditableGender(getVal(data, ["gender"], ""));
    setEditableStreet(getVal(data, ["street"], ""));
    setEditableLocality(getVal(data, ["locality", "loc"], ""));
    setEditableCity(getVal(data, ["city", "village", "vtc", "village_town_city"], ""));
    setEditableDistrict(getVal(data, ["district", "dist"], ""));
    setEditableState(getVal(data, ["state"], ""));
    setEditablePincode(getVal(data, ["pincode", "zip"], ""));
    setEditableCountry(getVal(data, ["country"], "INDIA"));
    setEditableHouse(getVal(data, ["house", "building"], ""));
    setEditableLandmark(getVal(data, ["landmark"], ""));
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidAadhaar) {
      setErrorMsg("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/onboarding/aadhaar-generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          aadhaar_number: cleanAadhaar
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setRefId(data.ref_id || data.reference_id || "REF_AADHAAR_MOCK");
        setOtpSent(true);
        setCountdown(60);
        if (data.otp) {
          setReceivedOtpNotice(`[Sandbox OTP]: ${data.otp}`);
          setOtpCode(data.otp);
        }
      } else {
        setErrorMsg(data.detail || data.message || "Failed to initiate UIDAI Aadhaar OTP.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Network error. Could not connect to verification server.");
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    await handleSendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP received on your mobile.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/aadhaar-submit-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          ref_id: refId,
          otp: otpCode.trim()
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setEkycResult(data);
        populateEditableFields(data);
      } else {
        const attempts = data.remaining_attempts ?? remainingAttempts - 1;
        setRemainingAttempts(attempts);
        setErrorMsg(
          data.detail ||
            data.message ||
            `Invalid OTP. Please check the SMS sent to your UIDAI registered mobile number. Attempts left: ${attempts}`
        );
      }
    } catch {
      setLoading(false);
      setErrorMsg("Verification network timeout. Please try again.");
    }
  };

  const handleContinueWithAadhaar = () => {
    const finalData = {
      ...(ekycResult || {}),
      aadhaar_number: cleanAadhaar,
      masked_aadhaar: maskedAadhaarDisplay,
      full_name: editableName || getVal(ekycResult, ["full_name", "name"]),
      dob: editableDob || getVal(ekycResult, ["dob", "date_of_birth"]),
      gender: editableGender || getVal(ekycResult, ["gender"]),
      street: editableStreet || getVal(ekycResult, ["street"]),
      locality: editableLocality || getVal(ekycResult, ["locality", "loc"]),
      city: editableCity || getVal(ekycResult, ["city", "village", "vtc"]),
      district: editableDistrict || getVal(ekycResult, ["district", "dist"]),
      state: editableState || getVal(ekycResult, ["state"]),
      pincode: editablePincode || getVal(ekycResult, ["pincode", "zip"]),
      country: editableCountry || "INDIA",
      house: editableHouse,
      landmark: editableLandmark,
      alt_address: editableAltAddress
    };

    onSuccess(finalData);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Aadhaar eKYC Verification
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          UIDAI Paperless eKYC Verification with live Demographic retrieval.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SCREEN 1: AADHAAR INPUT */}
      {!otpSent && !ekycResult && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1.5">
              12-Digit Aadhaar Number <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={formatAadhaarInput(aadhaarNumber)}
                onChange={(e) => {
                  setAadhaarNumber(e.target.value);
                  setErrorMsg("");
                }}
                maxLength={14}
                placeholder="4521 8901 2345"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-black font-mono tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20 transition-all"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] text-xs font-medium space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#94003A]" />
              UIDAI Safe Authentication Notice
            </p>
            <p className="text-[11px] leading-relaxed text-[#6B7280]">
              An OTP will be sent to the mobile number registered with your UIDAI Aadhaar record.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !isValidAadhaar}
              className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initiating UIDAI OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Aadhaar OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* SCREEN 2: ENTER OTP */}
      {otpSent && !ekycResult && (
        <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
          {receivedOtpNotice && (
            <div className="p-3 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/30 text-[#16A34A] text-xs font-mono font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{receivedOtpNotice}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#4B5563]">
                Enter 6-Digit Aadhaar OTP <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-[10px] font-bold text-[#9CA3AF]">
                Sent to UIDAI Mobile
              </span>
            </div>
            <input
              ref={otpInputRef}
              type="text"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setErrorMsg("");
              }}
              maxLength={6}
              placeholder="123456"
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-center font-mono text-xl font-black tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
            <span>
              {countdown > 0 ? (
                `Resend OTP in ${countdown}s`
              ) : (
                <span className="text-[#16A34A] font-bold">Ready to resend</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResend || loading}
              className="text-[#94003A] hover:underline disabled:opacity-40 cursor-pointer flex items-center gap-1 font-bold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resend OTP</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtpCode("");
              }}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Re-Enter Aadhaar</span>
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <span>Verify Aadhaar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* SCREEN 3: AADHAAR VERIFIED & EDITABLE DEMOGRAPHICS */}
      {ekycResult && (
        <div className="space-y-5 animate-fadeIn">
          {/* Success Banner */}
          <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1F2937]">
                  ✅ Aadhaar Verified Successfully
                </h3>
                <p className="text-[11px] text-[#4B5563] font-medium">
                  {maskedAadhaarDisplay} • UIDAI authenticated
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEkycResult(null);
                setOtpSent(false);
                setOtpCode("");
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-bold text-xs flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-[#6B7280]" />
              <span>Change</span>
            </button>
          </div>

          {/* Demographic Card with EDIT OPTION ON ALL TEXTBOXES */}
          <div className="p-5 rounded-3xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <BlurImage
                  src={getPhotoSrc(ekycResult)}
                  alt="Aadhaar Photo"
                  blurhash={KNOWN_BLURHASHES.AADHAAR_PLACEHOLDER}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#16A34A] shadow-md shrink-0 bg-[#E5E7EB]"
                />
                <div>
                  <span className="text-[10px] font-black uppercase text-[#16A34A] tracking-wider">
                    Customer Profile
                  </span>
                  <h4 className="text-base font-black text-[#1F2937]">
                    {editableName || "Customer Name"}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] font-extrabold flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" />
                All Fields Editable
              </span>
            </div>

            {/* Editable Textbox Grid for All Aadhaar Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  placeholder="Full Name as on Aadhaar"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="text"
                  value={editableDob}
                  onChange={(e) => setEditableDob(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={editableGender}
                  onChange={(e) => setEditableGender(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Street / Area
                </label>
                <input
                  type="text"
                  value={editableStreet}
                  onChange={(e) => setEditableStreet(e.target.value)}
                  placeholder="Street / Area Name"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Locality
                </label>
                <input
                  type="text"
                  value={editableLocality}
                  onChange={(e) => setEditableLocality(e.target.value)}
                  placeholder="Locality"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  City / Town
                </label>
                <input
                  type="text"
                  value={editableCity}
                  onChange={(e) => setEditableCity(e.target.value)}
                  placeholder="City or Town"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={editableDistrict}
                  onChange={(e) => setEditableDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={editableState}
                  onChange={(e) => setEditableState(e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={editablePincode}
                  onChange={(e) => setEditablePincode(e.target.value)}
                  placeholder="6-digit PIN code"
                  maxLength={6}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  House / Flat No
                </label>
                <input
                  type="text"
                  value={editableHouse}
                  onChange={(e) => setEditableHouse(e.target.value)}
                  placeholder="Flat/Door No"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={editableLandmark}
                  onChange={(e) => setEditableLandmark(e.target.value)}
                  placeholder="Nearby landmark"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  Alternate Address (Optional)
                </label>
                <input
                  type="text"
                  value={editableAltAddress}
                  onChange={(e) => setEditableAltAddress(e.target.value)}
                  placeholder="Any extra address line"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinueWithAadhaar}
            className="w-full py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Confirm & Continue to Bank Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
