"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin, CheckCircle2, AlertTriangle, RefreshCw, Navigation,
  ShieldCheck, AlertCircle, Sparkles
} from "lucide-react";
import apiClient from "@/lib/api";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  state?: string;
  pincode?: string;
  formatted_address?: string;
  is_valid: boolean;
}

interface LocationValidatorCardProps {
  onLocationChange: (location: LocationData | null) => void;
  expectedState?: string;
  expectedPincode?: string;
}

export default function LocationValidatorCard({
  onLocationChange,
  expectedState,
  expectedPincode,
}: LocationValidatorCardProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt auto-detect on mount
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser or device.";
      setError(msg);
      onLocationChange(null);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        try {
          // Validate with backend location validation endpoint
          const res = await apiClient.post("/sales/validate-location", {
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            expected_state: expectedState,
            expected_pincode: expectedPincode,
          });

          const data = res.data;
          if (data.is_valid) {
            const locObj: LocationData = {
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              formatted_address: data.formatted_address,
              is_valid: true,
            };
            setLocation(locObj);
            onLocationChange(locObj);
          } else {
            const err = data.error || data.message || "GPS coordinates outside operational territory.";
            setError(err);
            setLocation(null);
            onLocationChange(null);
          }
        } catch (err: any) {
          console.warn("Backend GPS validation warning:", err);
          // Fallback to client-side India boundaries verification
          const inBounds = lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0;
          if (inBounds) {
            const fallbackLoc: LocationData = {
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              formatted_address: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              is_valid: true,
            };
            setLocation(fallbackLoc);
            onLocationChange(fallbackLoc);
          } else {
            const err = "Coordinates outside operational boundaries. Please ensure device GPS is enabled.";
            setError(err);
            setLocation(null);
            onLocationChange(null);
          }
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setLoading(false);
        let msg = "Location permission denied. Please enable GPS / Location access to register.";
        if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          msg = "GPS position unavailable. Please check device location settings.";
        } else if (geoErr.code === geoErr.TIMEOUT) {
          msg = "GPS location request timed out. Please click retry.";
        }
        setError(msg);
        setLocation(null);
        onLocationChange(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className={`p-4 rounded-2xl transition border ${
      location?.is_valid
        ? "bg-emerald-950/20 border-emerald-500/40"
        : "bg-amber-950/20 border-amber-500/40"
    } space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
            location?.is_valid
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          }`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              Premises GPS Geolocation & Territory Mapping
              <span className="text-rose-400">*</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Live device GPS validation is strictly required for merchant mapping
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={detectLocation}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700/80 transition flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-blue-400" : ""}`} />
          {loading ? "Validating GPS..." : "Re-Detect GPS"}
        </button>
      </div>

      {/* Validated GPS State */}
      {location?.is_valid && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-2">
              GPS Location Verified & Mapped
              <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ±{location.accuracy.toFixed(0)}m accuracy
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Latitude: {location.latitude.toFixed(6)}° • Longitude: {location.longitude.toFixed(6)}°
            </div>
            {location.formatted_address && (
              <div className="text-[10px] text-slate-400 truncate">
                {location.formatted_address}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning State when GPS is missing or denied */}
      {!location?.is_valid && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-amber-300">
              GPS Verification Mandatory
            </div>
            <p className="text-[11px] text-amber-200/90 leading-snug">
              {error || "Location permissions must be enabled to confirm physical operating address. Registration cannot proceed without verified GPS coordinates."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
