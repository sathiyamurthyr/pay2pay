import { create } from "zustand";

export interface TransactionMemoryContext {
  activeModule: "dmt" | "card_to_cash" | "aeps" | "upi" | "wallet";
  selectedCustomer: any | null;
  selectedBeneficiary: any | null;
  amount: string;
  transferMode: "IMPS" | "NEFT";
  customerPin: string;
  referrerUrl: string | null;
}

interface TransactionMemoryState extends TransactionMemoryContext {
  setTransactionContext: (context: Partial<TransactionMemoryContext>) => void;
  setReferrerUrl: (url: string) => void;
  setSelectedCustomer: (customer: any) => void;
  setSelectedBeneficiary: (beneficiary: any) => void;
  setAmount: (amount: string) => void;
  setTransferMode: (mode: "IMPS" | "NEFT") => void;
  clearTransactionContext: () => void;
}

const initialContext: TransactionMemoryContext = {
  activeModule: "dmt",
  selectedCustomer: null,
  selectedBeneficiary: null,
  amount: "10000",
  transferMode: "IMPS",
  customerPin: "1234",
  referrerUrl: "/retailer/dmt",
};

// Pure in-memory Zustand store: ZERO localStorage, ZERO cookies, ZERO sessionStorage persistence
export const useTransactionMemoryStore = create<TransactionMemoryState>((set) => ({
  ...initialContext,

  setTransactionContext: (context) =>
    set((state) => ({ ...state, ...context })),

  setReferrerUrl: (url) => set(() => ({ referrerUrl: url })),

  setSelectedCustomer: (customer) =>
    set(() => ({ selectedCustomer: customer, selectedBeneficiary: null })),

  setSelectedBeneficiary: (beneficiary) =>
    set(() => ({ selectedBeneficiary: beneficiary })),

  setAmount: (amount) => set(() => ({ amount })),

  setTransferMode: (mode) => set(() => ({ transferMode: mode })),

  clearTransactionContext: () => set(() => ({ ...initialContext })),
}));
