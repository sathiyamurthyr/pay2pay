// Shared Axios API Client & Service SDK for Pay2Pay Platform

import axios, { AxiosInstance } from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "@pay2pay/constants";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30000
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    return Promise.reject(error);
  }
);

export const HealthService = {
  async getHealth() {
    const res = await apiClient.get("/health");
    return res.data;
  }
};
