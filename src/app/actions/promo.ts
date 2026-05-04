"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { normalizeCode, validatePromoCode } from "@/lib/promo";

// ─────────────────────────────────────────────────────────────────────────────
// User-facing: validate promo at checkout
// ─────────────────────────────────────────────────────────────────────────────

export type PromoApplyState =
  | { ok: true; code: string; finalCents: number; originalCents: number; discountCents: number; message: string }
  | { ok: false; error: string }
  | null;

const PaidPlan = z.enum(["BASIC", "PRO", "PREMIUM"]);

export async function applyPromoAction(
  _prev: PromoApplyState,
  formData: FormData
): Promise<PromoApplyState> {
  const user = await requireUser();

  const planParse = PaidPlan.safeParse(formData.get("plan"));
  if (!planParse.success) {
    return { ok: false, error: "Invalid plan." };
  }
  const code = String(formData.get("code") ?? "");
  const result = await validatePromoCode({
    code,
    plan: planParse.data,
    userId: user.id,
  });

  if (!result.ok) return { ok: false, error: result.message };

  return {
    ok: true,
    code: result.code,
    finalCents: result.finalCents,
    originalCents: result.originalCents,
    discountCents: result.discountCents,
    message: `Promo applied — you save ${(result.discountCents / 100).toLocaleString()} EGP.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: create / update / toggle / delete promo codes
// ─────────────────────────────────────────────────────────────────────────────

export type PromoFormState = { ok?: boolean; error?: string } | null;

const PromoSchema = z.object({
  code: z.string().min(2).max(40),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().int().min(1).max(100000),
  applicablePlans: z.array(z.enum(["BASIC", "PRO", "PREMIUM"])).optional(),
  maxUses: z.coerce.number().int().min(0).optional(),
  maxUsesPerUser: z.coerce.number().int().min(0).max(1000).default(1),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
  paymobLinkBasic: z.string().url().optional().or(z.literal("")),
  paymobLinkPro: z.string().url().optional().or(z.literal("")),
  paymobLinkPremium: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

function buildPaymobLinksJson(input: {
  paymobLinkBasic?: string;
  paymobLinkPro?: string;
  paymobLinkPremium?: string;
}): string | null {
  const map: Record<string, string> = {};
  if (input.paymobLinkBasic) map.BASIC = input.paymobLinkBasic;
  if (input.paymobLinkPro) map.PRO = input.paymobLinkPro;
  if (input.paymobLinkPremium) map.PREMIUM = input.paymobLinkPremium;
  return Object.keys(map).length === 0 ? null : JSON.stringify(map);
}

function fromForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? ""),
    discountType: String(formData.get("discountType") ?? ""),
    discountValue: formData.get("discountValue"),
    applicablePlans: formData.getAll("applicablePlans") as string[],
    maxUses: formData.get("maxUses"),
    maxUsesPerUser: formData.get("maxUsesPerUser"),
    expiresAt: String(formData.get("expiresAt") ?? ""),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    paymobLinkBasic: String(formData.get("paymobLinkBasic") ?? ""),
    paymobLinkPro: String(formData.get("paymobLinkPro") ?? ""),
    paymobLinkPremium: String(formData.get("paymobLinkPremium") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function adminCreatePromoAction(
  _prev: PromoFormState,
  formData: FormData
): Promise<PromoFormState> {
  await requireAdmin();
  const raw = fromForm(formData);
  const parsed = PromoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const normalized = normalizeCode(data.code);

  if (data.discountType === "PERCENT" && data.discountValue > 100) {
    return { error: "Percentage discount must be 1–100." };
  }

  const existing = await prisma.promoCode.findUnique({
    where: { code: normalized },
  });
  if (existing) return { error: `A promo code "${normalized}" already exists.` };

  const applicablePlansJson =
    data.applicablePlans && data.applicablePlans.length > 0
      ? JSON.stringify(data.applicablePlans)
      : "ALL";

  const newPromo = await prisma.promoCode.create({
    data: {
      code: normalized,
      discountType: data.discountType,
      discountValue: data.discountValue,
      applicablePlans: applicablePlansJson,
      maxUses: data.maxUses && data.maxUses > 0 ? data.maxUses : null,
      maxUsesPerUser: data.maxUsesPerUser ?? 1,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
      paymobLinks: buildPaymobLinksJson(data),
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin/promos");
  redirect(`/admin/promos/${newPromo.id}`);
}

export async function adminUpdatePromoAction(
  _prev: PromoFormState,
  formData: FormData
): Promise<PromoFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing promo id." };

  const raw = fromForm(formData);
  const parsed = PromoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const normalized = normalizeCode(data.code);

  if (data.discountType === "PERCENT" && data.discountValue > 100) {
    return { error: "Percentage discount must be 1–100." };
  }

  const conflict = await prisma.promoCode.findFirst({
    where: { code: normalized, NOT: { id } },
  });
  if (conflict) return { error: `Another promo with code "${normalized}" already exists.` };

  const applicablePlansJson =
    data.applicablePlans && data.applicablePlans.length > 0
      ? JSON.stringify(data.applicablePlans)
      : "ALL";

  await prisma.promoCode.update({
    where: { id },
    data: {
      code: normalized,
      discountType: data.discountType,
      discountValue: data.discountValue,
      applicablePlans: applicablePlansJson,
      maxUses: data.maxUses && data.maxUses > 0 ? data.maxUses : null,
      maxUsesPerUser: data.maxUsesPerUser ?? 1,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
      paymobLinks: buildPaymobLinksJson(data),
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin/promos");
  revalidatePath(`/admin/promos/${id}`);
  return { ok: true };
}

export async function adminTogglePromoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) return;
  await prisma.promoCode.update({
    where: { id },
    data: { isActive: !promo.isActive },
  });
  revalidatePath("/admin/promos");
  revalidatePath(`/admin/promos/${id}`);
}

export async function adminDeletePromoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.promoCode.delete({ where: { id } });
  revalidatePath("/admin/promos");
  redirect("/admin/promos");
}
