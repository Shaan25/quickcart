"use client";

import { useState, useEffect, useRef } from "react";

interface StoredLocation {
  lat: number;
  lng: number;
  label: string;
  city: string;
  pincode: string;
  serviceable: boolean;
}

interface GeoResult {
  lat: number;
  lng: number;
  label: string;
  city: string;
}

const STORAGE_KEY = "quickcart_location";

export function useLocation() {
  const [location, setLocation] = useState<StoredLocation | null>(null);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setLocation(raw ? JSON.parse(raw) : null);
      } catch {}
    }
    load();
    window.addEventListener("quickcart_location_changed", load);
    return () => window.removeEventListener("quickcart_location_changed", load);
  }, []);

  const saveLocation = (loc: StoredLocation) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    setLocation(loc);
    window.dispatchEvent(new Event("quickcart_location_changed"));
  };

  const clearLocation = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    window.dispatchEvent(new Event("quickcart_location_changed"));
  };

  return { location, saveLocation, clearLocation };
}

export function LocationPicker() {
  const { location, saveLocation, clearLocation } = useLocation();
  const [open, setOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPincode("");
      setStep("input");
      setGeoResult(null);
      setFetchStatus("idle");
      setErrorMsg("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setErrorMsg("Enter a 6-digit pincode");
      setFetchStatus("error");
      return;
    }
    setFetchStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/geocode?pincode=${pincode}`);
      const data = await res.json() as { lat?: number; lng?: number; label?: string; city?: string; error?: string };
      if (!res.ok || !data.lat) {
        setErrorMsg(data.error ?? "Could not find this pincode");
        setFetchStatus("error");
        return;
      }
      setGeoResult({ lat: data.lat!, lng: data.lng!, label: data.label ?? pincode, city: data.city ?? data.label ?? pincode });
      setFetchStatus("idle");
      setStep("confirm");
    } catch {
      setErrorMsg("Network error. Try again.");
      setFetchStatus("error");
    }
  }

  function handleConfirm(serviceable: boolean) {
    if (!geoResult) return;
    saveLocation({ ...geoResult, pincode, serviceable });
    setOpen(false);
  }



  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${
          location && !location.serviceable
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-gray-200 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span className="text-sm">{location && !location.serviceable ? "⚠️" : "📍"}</span>
        <span className="max-w-[120px] truncate">
          {location ? location.label : "Set location"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Delivery location</p>
            {location && step === "input" && (
              <button
                onClick={() => { clearLocation(); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
            {step === "confirm" && (
              <button
                onClick={() => setStep("input")}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          {step === "input" && (
            <>
              {location && (
                <div className={`mb-3 rounded-lg border px-3 py-2 ${location.serviceable ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <p className={`text-xs font-medium ${location.serviceable ? "text-emerald-700" : "text-amber-700"}`}>
                    {location.serviceable ? "📍" : "⚠️"} {location.label}
                  </p>
                  <p className={`text-xs ${location.serviceable ? "text-emerald-600" : "text-amber-600"}`}>
                    {location.serviceable ? `Pincode: ${location.pincode}` : "Marked as not serviceable"}
                  </p>
                </div>
              )}

              <form onSubmit={handleLookup} className="flex flex-col gap-2">
                <label className="text-xs text-gray-500">
                  {location ? "Change pincode" : "Enter your 6-digit pincode"}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 160070"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                {fetchStatus === "error" && (
                  <p className="text-xs text-red-500">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={fetchStatus === "loading" || pincode.length !== 6}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  {fetchStatus === "loading" ? "Looking up..." : "Find location"}
                </button>
              </form>
            </>
          )}

          {step === "confirm" && geoResult && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-xs font-medium text-gray-800">📍 {geoResult.label}</p>
                <p className="text-xs text-gray-500">Pincode: {pincode}</p>
              </div>

              <p className="text-xs font-medium text-gray-700">
                Do Blinkit, Zepto, or Instamart deliver to your area?
              </p>
              <p className="text-[10px] text-gray-400 -mt-2">
                These platforms only operate in select cities. You know your area best.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(true)}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Yes, they do
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  No, they don&apos;t
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
