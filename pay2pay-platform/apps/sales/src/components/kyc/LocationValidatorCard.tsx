"use client";

import React, { useState } from "react";
import {
  MapPin, CheckCircle2, AlertTriangle, Image as ImageIcon,
  Building2, Compass, ShieldCheck, Sparkles, UploadCloud, Copy, Check
} from "lucide-react";
import apiClient from "@/lib/api";

export interface ExifGpsData {
  available: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude?: number | null;
  captured_at?: string | null;
  reverse_geocoded?: {
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    formatted_address?: string;
  } | null;
  message?: string;
}

export interface OcrLocationData {
  available: boolean;
  raw_text?: string;
  detected_business_name?: string | null;
  detected_address?: string | null;
  detected_street?: string | null;
  detected_city?: string | null;
  detected_district?: string | null;
  detected_state?: string | null;
  detected_pincode?: string | null;
  confidence_score?: number;
  message?: string;
}

interface LocationValidatorCardProps {
  exifGps?: ExifGpsData | null;
  ocrLocation?: OcrLocationData | null;
  shopPhotoUrl?: string | null;
  onLocationExtracted?: (data: { exif_gps: ExifGpsData; ocr_location: OcrLocationData; b2_url?: string }) => void;
  onApplyOcrAddress?: (address: { street?: string; city?: string; state?: string; pincode?: string }) => void;
}

export default function LocationValidatorCard({
  exifGps,
  ocrLocation,
  shopPhotoUrl,
  onLocationExtracted,
  onApplyOcrAddress,
}: LocationValidatorCardProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setApplied(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "SHOP_PHOTO");
    formData.append("entity_type", "RET");

    try {
      const res = await apiClient.post("/sales/extract-image-location", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data;
      if (data.success && onLocationExtracted) {
        onLocationExtracted({
          exif_gps: data.exif_gps,
          ocr_location: data.ocr_location,
          b2_url: data.b2_url
        });
      }
    } catch (err: any) {
      console.warn("Failed to extract image location:", err);
      setError(err?.response?.data?.detail || "Failed to analyze uploaded photo for location data.");
    } finally {
      setUploading(false);
    }
  };

  const handleApplyAddress = () => {
    if (!ocrLocation || !onApplyOcrAddress) return;
    onApplyOcrAddress({
      street: ocrLocation.detected_address || ocrLocation.detected_street || undefined,
      city: ocrLocation.detected_city || undefined,
      state: ocrLocation.detected_state || undefined,
      pincode: ocrLocation.detected_pincode || undefined,
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const hasExif = Boolean(exifGps?.available && exifGps.latitude && exifGps.longitude);
  const hasOcr = Boolean(ocrLocation?.available);

  return (
    <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F8E6EE] text-[#94003A] flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#1F2937] flex items-center gap-2">
              <span>Image-Derived Location & Premises Inspector</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                Image Exclusive
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Location is extracted exclusively from uploaded premises photo EXIF &amp; OCR
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div>
          <label className="px-3.5 py-2 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 transition-all shadow-md shadow-[#94003A]/20">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{uploading ? "Analyzing Image..." : shopPhotoUrl ? "Change Photo" : "Upload Premises Photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] font-medium">
          {error}
        </div>
      )}

      {/* Grid: 1. EXIF GPS | 2. OCR Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EXIF GPS Section */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasExif
            ? "bg-[#F0FDF4] border-[#86EFAC]"
            : "bg-[#FAFAFC] border-[#E5E7EB]"
        } space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1F2937]">
              <MapPin className={`w-4 h-4 ${hasExif ? "text-[#16A34A]" : "text-[#9CA3AF]"}`} />
              <span>EXIF GPS Coordinates</span>
            </div>
            {hasExif ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                EXIF Metadata Found
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                Unavailable in EXIF
              </span>
            )}
          </div>

          {hasExif ? (
            <div className="space-y-1.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-[#BBF7D0] font-mono text-[11px] text-[#1F2937]">
                <div className="font-bold text-[#166534]">
                  Lat: {exifGps?.latitude?.toFixed(6)}° • Lng: {exifGps?.longitude?.toFixed(6)}°
                </div>
                {exifGps?.altitude && (
                  <div className="text-[10px] text-[#6B7280] mt-0.5">
                    Altitude: {exifGps.altitude}m • Captured: {exifGps.captured_at || "N/A"}
                  </div>
                )}
              </div>
              {exifGps?.reverse_geocoded?.formatted_address && (
                <div className="text-[11px] text-[#4B5563] leading-relaxed">
                  <span className="font-semibold text-[#1F2937]">Reverse Geocoded: </span>
                  {exifGps.reverse_geocoded.formatted_address}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#6B7280] space-y-1">
              <p className="font-medium text-[#4B5563]">
                {exifGps?.message || "GPS metadata is unavailable in the uploaded image's EXIF data."}
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                Coordinates are derived strictly from image metadata and never fabricated.
              </p>
            </div>
          )}
        </div>

        {/* OCR Location Section */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasOcr
            ? "bg-[#EFF6FF] border-[#BFDBFE]"
            : "bg-[#FAFAFC] border-[#E5E7EB]"
        } space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1F2937]">
              <Building2 className={`w-4 h-4 ${hasOcr ? "text-[#2563EB]" : "text-[#9CA3AF]"}`} />
              <span>OCR-Derived Address Text</span>
            </div>
            {hasOcr ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Address Text Detected
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                No Visible Text
              </span>
            )}
          </div>

          {hasOcr ? (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-[#BFDBFE] space-y-1">
                {ocrLocation?.detected_business_name && (
                  <div className="text-[11px] font-bold text-[#1E40AF]">
                    Store / Signboard: {ocrLocation.detected_business_name}
                  </div>
                )}
                {ocrLocation?.detected_address && (
                  <div className="text-[11px] text-[#1F2937]">
                    Address: {ocrLocation.detected_address}
                  </div>
                )}
                <div className="text-[10px] text-[#6B7280] flex flex-wrap gap-2 pt-0.5">
                  {ocrLocation?.detected_city && <span>City: <strong className="text-[#1F2937]">{ocrLocation.detected_city}</strong></span>}
                  {ocrLocation?.detected_state && <span>State: <strong className="text-[#1F2937]">{ocrLocation.detected_state}</strong></span>}
                  {ocrLocation?.detected_pincode && <span>PIN: <strong className="text-[#1F2937]">{ocrLocation.detected_pincode}</strong></span>}
                </div>
              </div>

              {onApplyOcrAddress && (
                <button
                  type="button"
                  onClick={handleApplyAddress}
                  className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#2563EB] border border-[#BFDBFE] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  {applied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{applied ? "Applied to Form Address!" : "Apply OCR Address to Form"}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#6B7280] space-y-1">
              <p className="font-medium text-[#4B5563]">
                {ocrLocation?.message || "No visible address or signboard text detected by OCR in this image."}
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                OCR searches for shop boards, street names, pincodes, and states.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
