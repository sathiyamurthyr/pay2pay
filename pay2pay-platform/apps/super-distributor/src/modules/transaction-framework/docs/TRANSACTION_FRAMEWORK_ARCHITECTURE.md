# PAY2PAY Enterprise Transaction Framework Architecture

---

## 1. Core Purpose & Architectural Pipeline

The **PAY2PAY Enterprise Transaction Framework** is the universal transaction processing engine inherited by all current and future financial services:

```
AppShell
   └── TransactionLayout (service="DMT" | "AEPS" | "CardToCash" | "Payout" | ...)
         └── TransactionWorkspace
               ├── ServiceConfig (Adapter)
               ├── TransactionSearch (Universal Search Input)
               ├── CustomerPanel (KYC, Daily Limit & Preferred Bank Card)
               ├── BeneficiaryPanel (Grid Selection - Active when supported)
               ├── AmountPanel (Transfer Entry & Quick Amount Chips)
               ├── ChargesPanel (Breakdown of Convenience Fee & Net Payable)
               └── RecentTransactions (Audit Ledger Data Grid)
```

---

## 2. Supported Financial Service Adapters (`SERVICE_CONFIGS`)

| Service Type | Service Name | Search Input | Beneficiary Grid | Biometric | Charge Rate | Fixed Fee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`DMT`** | Direct Money Transfer | Mobile / Customer ID | **Yes** | No | 0.50% | ₹10 |
| **`AEPS`** | Aadhaar Enabled Payments | Aadhaar / Mobile | No | **Yes** | 0.25% | ₹5 |
| **`CardToCash`** | POS Card Cash Out | Card Serial / Mobile | No | No | 0.75% | ₹15 |
| **`CashDeposit`** | CDM Account Deposit | Account / Mobile | No | No | 0.30% | ₹8 |
| **`CashWithdrawal`** | Micro-ATM Cash Payout | Mobile / ATM Card | No | No | 0.20% | ₹5 |
| **`WalletTransfer`** | Retailer P2P Top-Up | Wallet ID / Mobile | No | No | 0.00% | ₹0 |
| **`Payout`** | Bank Move Settlement | Account / IFSC | **Yes** | No | 0.10% | ₹5 |

---

## 3. Zero UI Duplication Verification

Adding any new financial service (e.g., Cash Deposit, Payout, Wallet Top-Up) requires **0 new UI components**.

Example usage for any new module:
```tsx
import { TransactionLayout } from "@/modules/transaction-framework";

export default function CashDepositPage() {
  return <TransactionLayout service="CashDeposit" />;
}
```
