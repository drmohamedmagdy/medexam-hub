// Manual (non-Paymob) payment destinations. Users send the money directly to
// these accounts and submit a transaction reference; an admin reviews each
// submission in /admin/payments and either approves it (activating the plan)
// or rejects it.

export const VODAFONE_CASH_NUMBER = "01010087375";
export const VODAFONE_CASH_DISPLAY = "+20 10 1008 7375";

export const INSTAPAY_LINK = "https://ipn.eg/S/sjsxe/instapay/9JMTXO";
export const INSTAPAY_HANDLE_DISPLAY = "ipn.eg/S/sjsxe/instapay/9JMTXO";

export type ManualPaymentMethod = "VODAFONE_CASH" | "INSTAPAY";

export function isManualMethod(method: string): method is ManualPaymentMethod {
  return method === "VODAFONE_CASH" || method === "INSTAPAY";
}
