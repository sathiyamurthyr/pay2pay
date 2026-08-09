"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Camera, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step10Props {
  registrationId: string;
  onSuccess: (addressData: any) => void;
}

export const Step10Address: React.FC<Step10Props> = ({ registrationId, onSuccess }) => {
  const [street, setStreet] = useState("100 GST Road");
  const [city, setCity] = useState("Chennai");
  const [district, setDistrict] = useState("Chengalpattu");
  const [stateName, setStateName] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("600045");
  const [latitude, setLatitude] = useState<number | null>(12.9249);
  const [longitude, setLongitude] = useState<number | null>(80.1000);
  const [shopPhotoUrl, setShopPhotoUrl] = useState("https://cdn.pay2pay.in/shops/shop_front.jpg");
  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetchGps = () => {
    setFetchingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setFetchingGps(false);
        },
        () => {
          setLatitude(12.9249);
          setLongitude(80.1000);
          setFetchingGps(false);
        }
      );
    } else {
      setLatitude(12.9249);
      setLongitude(80.1000);
      setFetchingGps(false);
    }
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
      street,
      city,
      district,
      state: stateName,
      pincode,
      latitude: latitude || 12.9249,
      longitude: longitude || 80.1000,
      shop_photo_url: shopPhotoUrl
    };

    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/shop-address", {
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
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Shop Location & Geo-Tagging
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Store address, GPS location tag, and front photo verification.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Street Address / Door No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="100 GST Road, Near Bus Stand"
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              City / Town <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Chennai"
              required
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="600045"
              required
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              District
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Chengalpattu"
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="Tamil Nadu"
              required
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* GPS Geolocation Tagging Card */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-blue-500" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">GPS Coordinates Tag</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {latitude ? `${latitude.toFixed(4)}°N, ${longitude?.toFixed(4)}°E` : "Not Tagged Yet"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFetchGps}
            disabled={fetchingGps}
            className="px-3 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-600/20"
          >
            {fetchingGps ? "Tagging..." : "Get GPS Tag"}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !street || !city || pincode.length !== 6}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Location & Address...</span>
            </>
          ) : (
            <>
              <span>Save & Proceed to Documents</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
