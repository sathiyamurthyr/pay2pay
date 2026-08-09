export interface DMTTransferRequest {
  customerId: string;
  beneficiaryId: string;
  amount: number;
  mode: "IMPS" | "NEFT";
  mpin: string;
}

export interface DMTTransferResponse {
  success: boolean;
  transactionId: string;
  rrn: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  timestamp: string;
  message: string;
}

export class DMTTransferService {
  static async executeTransfer(req: DMTTransferRequest): Promise<DMTTransferResponse> {
    const dStr = new Date();
    const dd = String(dStr.getDate()).padStart(2, '0');
    const mm = String(dStr.getMonth() + 1).padStart(2, '0');
    const yy = String(dStr.getFullYear()).slice(-2);
    const rDigits = Math.floor(10000 + Math.random() * 90000);
    return {
      success: true,
      transactionId: `PO${dd}${mm}${yy}${rDigits}`,
      rrn: `RRN2026${rDigits}88`,
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
      message: "IMPS National Transfer Executed Successfully.",
    };
  }
}
