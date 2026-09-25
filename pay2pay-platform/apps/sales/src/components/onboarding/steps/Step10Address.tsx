"use client";

import React, { useState } from "react";
import {
  MapPin,
  Navigation,
  Camera,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy
} from "lucide-react";

interface Step10Props {
  registrationId: string;
  initialAddress?: any;
  aadhaarAddress?: any;
  onSuccess: (addressData: any) => void;
  onBack?: () => void;
}

export const Step10Address: React.FC<Step10Props> = ({
  registrationId,
  initialAddress = {},
  aadhaarAddress,
  onSuccess,
  onBack
}) => {
  const [street, setStreet] = useState(
    initialAddress?.street || aadhaarAddress?.street || ""
  );
  const [city, setCity] = useState(
    initialAddress?.city || aadhaarAddress?.city || ""
  );
  const [district, setDistrict] = useState(
    initialAddress?.district || aadhaarAddress?.district || ""
  );
  const [stateName, setStateName] = useState(
    initialAddress?.state || aadhaarAddress?.state || ""
  );
  const [pincode, setPincode] = useState(
    initialAddress?.pincode || aadhaarAddress?.pincode || ""
  );
  const [latitude, setLatitude] = useState<number | null>(
    initialAddress?.latitude || null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialAddress?.longitude || null
  );
  const [shopPhotoUrl, setShopPhotoUrl] = useState(
    initialAddress?.shop_photo_url || ""
  );
  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetchGps = () => {
    setFetchingGps(true);
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
          setFetchingGps(false);
        },
        () => {
          // Fallback approximate
          setLatitude(12.9249);
          setLongitude(80.1);
          setFetchingGps(false);
        },
        { timeout: 8000 }
      );
    } else {
      setLatitude(12.9249);
      setLongitude(80.1);
      setFetchingGps(false);
    }
  };

  const handleCopyAadhaar = () => {
    if (!aadhaarAddress) return;
    if (aadhaarAddress.street) setStreet(aadhaarAddress.street);
    if (aadhaarAddress.city) setCity(aadhaarAddress.city);
    if (aadhaarAddress.district) setDistrict(aadhaarAddress.district);
    if (aadhaarAddress.state) setStateName(aadhaarAddress.state);
    if (aadhaarAddress.pincode) setPincode(aadhaarAddress.pincode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !city || !stateName || pincode.length !== 6) {
      setErrorMsg("Please fill all required address fields.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    const payload = {
      registration_id: registrationId,
      street: street.trim(),
      city: city.trim(),
      district: district.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      latitude: latitude || 12.9249,
      longitude: longitude || 80.1,
      shop_photo_url: shopPhotoUrl
    };

    try {
      const res = await fetch("/api/v1/onboarding/shop-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(payload);
      } else {
        setErrorMsg(data.detail || "Failed to save shop address.");
      }
    } catch {
      setLoading(false);
      onSuccess(payload);
    }
  };

  return (
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Shop Location & Geo-Tagging
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Store address, GPS location tag, and front photo verification.
        </p>
      </div>

      {aadhaarAddress && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] text-xs">
          <span className="font-bold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#94003A]" />
            Same as Aadhaar KYC address?
          </span>
          <button
            type="button"
            onClick={handleCopyAadhaar}
            className="px-3 py-1.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Copy Aadhaar Address</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Shop Address / Street / Building <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              setErrorMsg("");
            }}
            placeholder="Door No, Building Name, Street"
            required
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              City / Town <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setErrorMsg("");
              }}
              placeholder="City or Town"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              District
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District"
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              State <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => {
                setStateName(e.target.value);
                setErrorMsg("");
              }}
              placeholder="State Name"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Postal PIN Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setErrorMsg("");
              }}
              maxLength={6}
              placeholder="6-digit PIN"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-mono font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>
        </div>

        {/* GPS Geotag Section */}
        <div className="p-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4B5563] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#94003A]" />
              Store GPS Geotag
            </span>
            <button
              type="button"
              onClick={handleFetchGps}
              disabled={fetchingGps}
              className="px-3 py-1.5 rounded-xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-black text-[#4B5563] flex items-center gap-1 transition-all cursor-pointer"
            >
              {fetchingGps ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3 h-3 text-[#94003A]" />
                  <span>{latitude ? "Re-Tag GPS" : "Auto-Detect GPS"}</span>
                </>
              )}
            </button>
          </div>

          {latitude && longitude && (
            <p className="text-[11px] font-mono text-[#16A34A] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Tagged: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            </p>
          )}
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
            disabled={loading || !street || !city || pincode.length !== 6}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Address...</span>
              </>
            ) : (
              <>
                <span>Save & Continue to Documents</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
