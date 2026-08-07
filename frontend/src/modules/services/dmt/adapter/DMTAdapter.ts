import { ServiceConfig, SERVICE_CONFIGS } from "@/modules/transaction-framework";
import { DMTCustomerService } from "../services/customer.service";
import { DMTTransferService, DMTTransferRequest } from "../services/transfer.service";
import { calculateDMTFeeBreakdown } from "../validation/charges.validation";
import { validateTransferAmount } from "../validation/amount.validation";

export class DMTAdapter {
  static getConfig(): ServiceConfig {
    return SERVICE_CONFIGS.DMT;
  }

  static async searchCustomer(mobile: string) {
    return DMTCustomerService.searchCustomerByMobile(mobile);
  }

  static validateAmount(amount: number, remainingDailyLimit: number) {
    return validateTransferAmount(amount, remainingDailyLimit);
  }

  static calculateCharges(amount: number, mode: "IMPS" | "NEFT" = "IMPS") {
    return calculateDMTFeeBreakdown(amount, mode);
  }

  static async executeTransfer(req: DMTTransferRequest) {
    return DMTTransferService.executeTransfer(req);
  }
}
