import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export interface OnboardingStatus {
  completed: boolean;
  current_step: number;
  progress_percentage: number;
  completed_steps: number[];
  status: string;
  started_at: string;
  last_saved_at: string;
  version: number;
  redirect_url: string;
  draft_data: Record<string, any>;
}

export function useOnboardingPersistence() {
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/onboarding/status");
      const data: OnboardingStatus = res.data;
      setStatus(data);
      return data;
    } catch (err: any) {
      console.error("[ONBOARDING PERSISTENCE ERROR] Could not fetch DB status:", err);
      setError("Unable to load onboarding status from server.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const saveStep = async (stepNumber: number, stepData: Record<string, any>, isCompleted = true, isFinal = false) => {
    setSaving(true);
    try {
      const res = await api.post("/api/v1/onboarding/save", {
        step_number: stepNumber,
        step_data: stepData,
        is_completed: isCompleted,
        is_final: isFinal
      });
      const updated: OnboardingStatus = res.data;
      setStatus(updated);
      return updated;
    } catch (err: any) {
      console.error(`[ONBOARDING SAVE ERROR] Step ${stepNumber} failed:`, err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const adminReset = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/v1/onboarding/reset");
      const updated: OnboardingStatus = res.data;
      setStatus(updated);
      router.push("/register");
      return updated;
    } catch (err: any) {
      console.error("[ONBOARDING ADMIN RESET ERROR]:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    saving,
    error,
    fetchStatus,
    saveStep,
    adminReset
  };
}
