"use client";

import React, { useState } from "react";
import {
  MapPin,
  Camera,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Compass,
  Building2,
  UploadCloud,
  Sparkles
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
  const [exifGps, setExifGps] = useState<any>(initialAddress?.exif_gps || null);
  const [ocrLocation, setOcrLocation] = useState<any>(initialAddress?.ocr_location || null);
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingImage(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "SHOP_PHOTO");
    formData.append("entity_type", "RET");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/sales/auto-read-doc", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && (data.b2_url || data.photo_url)) {
        setShopPhotoUrl(data.b2_url || data.photo_url);
        if (data.exif_gps) {
          setExifGps(data.exif_gps);
          if (data.exif_gps.available && data.exif_gps.latitude && data.exif_gps.longitude) {
            setLatitude(data.exif_gps.latitude);
            setLongitude(data.exif_gps.longitude);
          }
        }
        if (data.ocr_location) {
          setOcrLocation(data.ocr_location);
          if (!street && data.ocr_location.detected_address) {
            setStreet(data.ocr_location.detected_address);
          }
          if (!city && data.ocr_location.detected_city) {
            setCity(data.ocr_location.detected_city);
          }
          if (!pincode && data.ocr_location.detected_pincode) {
            setPincode(data.ocr_location.detected_pincode);
          }
        }
      }
    } catch {
      console.warn("Failed to extract image location");
    } finally {
      setAnalyzingImage(false);
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

  const handleApplyOcr = () => {
    if (!ocrLocation) return;
    if (ocrLocation.detected_address) setStreet(ocrLocation.detected_address);
    if (ocrLocation.detected_city) setCity(ocrLocation.detected_city);
    if (ocrLocation.detected_state) setStateName(ocrLocation.detected_state);
    if (ocrLocation.detected_pincode) setPincode(ocrLocation.detected_pincode);
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
      district: district.trim() || city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      latitude: latitude,
      longitude: longitude,
      shop_photo_url: shopPhotoUrl,
      exif_gps_available: Boolean(exifGps?.available),
      exif_latitude: exifGps?.latitude || null,
      exif_longitude: exifGps?.longitude || null,
      exif_altitude: exifGps?.altitude || null,
      exif_captured_at: exifGps?.captured_at || null,
      exif_reverse_address: exifGps?.reverse_geocoded?.formatted_address || null,
      ocr_location_available: Boolean(ocrLocation?.available),
      ocr_raw_text: ocrLocation?.raw_text || null,
      ocr_detected_address: ocrLocation?.detected_address || null,
      ocr_detected_city: ocrLocation?.detected_city || null,
      ocr_detected_state: ocrLocation?.detected_state || null,
      ocr_detected_pincode: ocrLocation?.detected_pincode || null,
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
          Shop Location &amp; Image-Derived Verification
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Location is extracted exclusively from uploaded premises photo EXIF and OCR metadata
        </p>
      </div>

      {aadhaarAddress && (
        <div className="flex items-center justify-between p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl">
          <div className="text-xs text-[#1E40AF]">
            <span className="font-bold">Aadhaar Address detected: </span>
            {aadhaarAddress.city}, {aadhaarAddress.state} ({aadhaarAddress.pincode})
          </div>
          <button
            type="button"
            onClick={handleCopyAadhaar}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F3F4F6] text-[#2563EB] text-xs font-bold rounded-xl border border-[#BFDBFE] transition shadow-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy to Shop</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Image-Derived Location & Premises Inspector ── */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F8E6EE] text-[#94003A] flex items-center justify-center font-bold">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#1F2937]">Commercial Premises Photo &amp; Location</div>
              <p className="text-[11px] text-[#6B7280]">Upload storefront photo to extract EXIF GPS &amp; OCR address text</p>
            </div>
          </div>

          <label className="px-3.5 py-2 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 transition-all shadow-md shadow-[#94003A]/20">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{analyzingImage ? "Analyzing..." : shopPhotoUrl ? "Change Photo" : "Upload Storefront Photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={analyzingImage}
            />
          </label>
        </div>

        {/* EXIF GPS & OCR Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* EXIF GPS Card */}
          <div className={`p-3.5 rounded-xl border ${
            exifGps?.available && exifGps?.latitude
              ? "bg-[#F0FDF4] border-[#86EFAC]"
              : "bg-[#FAFAFC] border-[#E5E7EB]"
          } space-y-1.5 text-xs`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2937] flex items-center gap-1.5">
                <MapPin className={`w-3.5 h-3.5 ${exifGps?.available ? "text-[#16A34A]" : "text-[#9CA3AF]"}`} />
                EXIF GPS Coordinates
              </span>
              {exifGps?.available ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                  ✓ Found in EXIF
                </span>
              ) : (
                <span className="text-[10px] text-[#6B7280]">Unavailable in EXIF</span>
              )}
            </div>
            {exifGps?.available && exifGps?.latitude ? (
              <div className="font-mono text-[11px] text-[#166534]">
                Lat: {exifGps.latitude.toFixed(6)}°, Lng: {exifGps.longitude.toFixed(6)}°
                {exifGps.reverse_geocoded?.formatted_address && (
                  <div className="font-sans text-[10px] text-[#4B5563] mt-1">
                    {exifGps.reverse_geocoded.formatted_address}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[#6B7280]">
                GPS metadata is unavailable in the uploaded image. Coordinates are not inferred or fabricated.
              </p>
            )}
          </div>

          {/* OCR Location Card */}
          <div className={`p-3.5 rounded-xl border ${
            ocrLocation?.available
              ? "bg-[#EFF6FF] border-[#BFDBFE]"
              : "bg-[#FAFAFC] border-[#E5E7EB]"
          } space-y-1.5 text-xs`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2937] flex items-center gap-1.5">
                <Building2 className={`w-3.5 h-3.5 ${ocrLocation?.available ? "text-[#2563EB]" : "text-[#9CA3AF]"}`} />
                OCR Detected Location
              </span>
              {ocrLocation?.available ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                  ✓ Text Detected
                </span>
              ) : (
                <span className="text-[10px] text-[#6B7280]">No Visible Text</span>
              )}
            </div>
            {ocrLocation?.available ? (
              <div className="space-y-1">
                <div className="text-[11px] text-[#1F2937]">
                  {ocrLocation.detected_address || ocrLocation.detected_business_name || "Location text extracted"}
                </div>
                <button
                  type="button"
                  onClick={handleApplyOcr}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#F3F4F6] text-[#2563EB] border border-[#BFDBFE] rounded text-[10px] font-bold"
                >
                  <Sparkles className="w-3 h-3" />
                  Apply to Address Form
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#6B7280]">
                No visible shop signboard address text detected by OCR in this image.
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Address Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Store / Building Address *
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. Shop No. 4, Ground Floor, Anna Nagar Main Road"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#1F2937] focus:border-[#94003A] focus:ring-1 focus:ring-[#94003A] outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4B5563] mb-1">
                City / Town *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#1F2937] focus:border-[#94003A] focus:ring-1 focus:ring-[#94003A] outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5563] mb-1">
                District *
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#1F2937] focus:border-[#94003A] focus:ring-1 focus:ring-[#94003A] outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4B5563] mb-1">
                State *
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g. Tamil Nadu"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#1F2937] focus:border-[#94003A] focus:ring-1 focus:ring-[#94003A] outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5563] mb-1">
                PIN Code *
              </label>
              <input
                type="text"
                value={pincode}
                maxLength={6}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 600045"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-semibold text-[#1F2937] focus:border-[#94003A] focus:ring-1 focus:ring-[#94003A] outline-hidden font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex-2 py-3 bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#94003A]/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Save &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
