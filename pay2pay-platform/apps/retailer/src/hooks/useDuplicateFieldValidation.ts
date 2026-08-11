import { useState } from "react";
import { api } from "@/lib/api";

export function useDuplicateFieldValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const validateField = async (field: string, value: string, excludeRetailerId?: string) => {
    if (!value || !value.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }

    setLoadingField(field);
    try {
      await api.post("/api/v1/retailers/validate-duplicate", {
        field,
        value: value.trim(),
        exclude_retailer_id: excludeRetailerId || null
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = detail?.message || err?.response?.data?.message || `${field} already exists in this company.`;
      setErrors((prev) => ({
        ...prev,
        [field]: msg
      }));
      return false;
    } finally {
      setLoadingField(null);
    }
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    loadingField,
    validateField,
    clearError,
    hasErrors
  };
}
