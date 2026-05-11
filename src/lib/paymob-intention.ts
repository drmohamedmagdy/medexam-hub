import "server-only";
import { createHmac } from "node:crypto";

/**
 * Paymob Intention API client.
 *
 * Workflow (new flow, replacing the legacy 3-step auth/order/payment-key):
 *
 *   1. createPaymentIntention({ amount, currency, items, billing, method })
 *      → POST /v1/intention/ with the secret key
 *      → returns { clientSecret, id }
 *   2. Redirect the user to:
 *        https://accept.paymob.com/unifiedcheckout/?publicKey=<PUBLIC>&clientSecret=<SECRET>
 *      Paymob handles the UI; user pays; gets redirected back to our return URL.
 *   3. Paymob also POSTs to our webhook ( /api/payments/paymob/webhook )
 *      with the transaction result. We verify the HMAC, then mark our
 *      PaymentOrder PAID and advance the user's plan.
 *
 * Reference: https://developers.paymob.com/paymob-docs/payments-and-features/payment-methods
 */

const BASE_URL =
  process.env.PAYMOB_BASE_URL || "https://accept.paymob.com/v1";

export type PaymentMethod = "card" | "wallet" | "instapay";

function integrationIdFor(method: PaymentMethod): number | null {
  const map: Record<PaymentMethod, string | undefined> = {
    card: process.env.PAYMOB_INTEGRATION_ID_CARD,
    wallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
    instapay: process.env.PAYMOB_INTEGRATION_ID_INSTAPAY,
  };
  const raw = map[method];
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

export type CreateIntentionArgs = {
  /** Amount in piasters (EGP × 100). */
  amountCents: number;
  /** ISO currency code — "EGP" for Egypt. */
  currency: string;
  /** Methods the user can pay with. Translated to Paymob integration IDs. */
  methods: PaymentMethod[];
  /** Short description shown on the receipt + dashboard. */
  description: string;
  /** Our internal order id — echoed back on the webhook so we can match. */
  externalOrderId: string;
  /** Billing data Paymob requires (most fields can be sensible defaults). */
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  /** Where Paymob redirects after the user completes (or cancels) payment. */
  redirectUrl: string;
  /** Optional: our own webhook URL. Most accounts configure this in the
   *  dashboard once and don't need to pass it per-call. */
  notificationUrl?: string;
};

export type CreateIntentionResult = {
  clientSecret: string;
  intentionId: string;
  checkoutUrl: string;
};

/**
 * Calls POST /v1/intention/ and returns the client secret + a ready
 * checkout URL the caller can redirect to.
 */
export async function createPaymentIntention(
  args: CreateIntentionArgs
): Promise<CreateIntentionResult> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  if (!secretKey) {
    throw new Error("PAYMOB_SECRET_KEY is not set");
  }
  if (!publicKey) {
    throw new Error("PAYMOB_PUBLIC_KEY is not set");
  }

  const integrationIds: number[] = [];
  for (const m of args.methods) {
    const id = integrationIdFor(m);
    if (id) integrationIds.push(id);
  }
  if (integrationIds.length === 0) {
    throw new Error(
      `No Paymob integration IDs configured for methods: ${args.methods.join(", ")}`
    );
  }

  const body: Record<string, unknown> = {
    amount: args.amountCents,
    currency: args.currency,
    payment_methods: integrationIds,
    items: [
      {
        name: args.description.slice(0, 100),
        amount: args.amountCents,
        description: args.description.slice(0, 200),
        quantity: 1,
      },
    ],
    billing_data: {
      first_name: args.billing.firstName.slice(0, 50) || "MedExam",
      last_name: args.billing.lastName.slice(0, 50) || "User",
      email: args.billing.email,
      phone_number: args.billing.phoneNumber || "+201000000000",
      country: "EG",
      state: "Cairo",
      city: "Cairo",
      street: "N/A",
      building: "N/A",
      floor: "N/A",
      apartment: "N/A",
    },
    extras: { external_order_id: args.externalOrderId },
    special_reference: args.externalOrderId,
    redirection_url: args.redirectUrl,
    ...(args.notificationUrl ? { notification_url: args.notificationUrl } : {}),
  };

  const res = await fetch(`${BASE_URL}/intention/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Token ${secretKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Paymob intention failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    client_secret?: string;
    id?: string;
  };
  if (!data.client_secret) {
    throw new Error("Paymob response missing client_secret");
  }

  const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}`;

  return {
    clientSecret: data.client_secret,
    intentionId: data.id ?? "",
    checkoutUrl,
  };
}

/**
 * Paymob signs webhook callbacks with HMAC-SHA512 over a concatenated
 * string of specific transaction fields, in a fixed canonical order.
 * The result is hex-encoded.
 *
 * The field order Paymob documents for the Transaction Processed callback:
 *   amount_cents
 *   created_at
 *   currency
 *   error_occured
 *   has_parent_transaction
 *   id
 *   integration_id
 *   is_3d_secure
 *   is_auth
 *   is_capture
 *   is_refunded
 *   is_standalone_payment
 *   is_voided
 *   order.id
 *   owner
 *   source_data.pan
 *   source_data.sub_type
 *   source_data.type
 *   success
 *
 * The "pending" field has been removed in newer versions; we accept its
 * absence. If a Paymob template that includes pending is encountered we
 * gracefully fall through.
 */
export function verifyWebhookHmac(
  body: Record<string, unknown>,
  receivedHmac: string
): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) return false;
  if (!receivedHmac) return false;

  const order = (body.order ?? {}) as Record<string, unknown>;
  const sourceData = (body.source_data ?? {}) as Record<string, unknown>;

  const concat = [
    body.amount_cents,
    body.created_at,
    body.currency,
    body.error_occured,
    body.has_parent_transaction,
    body.id,
    body.integration_id,
    body.is_3d_secure,
    body.is_auth,
    body.is_capture,
    body.is_refunded,
    body.is_standalone_payment,
    body.is_voided,
    order.id,
    body.owner,
    sourceData.pan,
    sourceData.sub_type,
    sourceData.type,
    body.success,
  ]
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join("");

  const expected = createHmac("sha512", secret).update(concat).digest("hex");
  // Constant-time comparison.
  if (expected.length !== receivedHmac.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ receivedHmac.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isPaymobConfigured(): boolean {
  return Boolean(
    process.env.PAYMOB_SECRET_KEY &&
      process.env.PAYMOB_PUBLIC_KEY &&
      process.env.PAYMOB_HMAC_SECRET
  );
}
