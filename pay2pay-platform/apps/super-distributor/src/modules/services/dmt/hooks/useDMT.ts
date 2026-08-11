import { useState } from "react";
import { DMTAdapter } from "../adapter/DMTAdapter";
import { DMTTransferRequest, DMTTransferResponse } from "../services/transfer.service";

export function useDMT() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<DMTTransferResponse | null>(null);

  const processDMT = async (req: DMTTransferRequest) => {
    setIsSubmitting(true);
    try {
      const res = await DMTAdapter.executeTransfer(req);
      setLastReceipt(res);
      setIsSubmitting(false);
      return res;
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  };

  return { isSubmitting, lastReceipt, processDMT };
}
