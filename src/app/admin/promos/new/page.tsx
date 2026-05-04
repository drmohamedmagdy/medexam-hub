import Link from "next/link";
import PromoForm from "../PromoForm";

export const metadata = { title: "Admin — New promo code" };

export default function NewPromoPage() {
  return (
    <div>
      <Link href="/admin/promos" className="text-sm text-zinc-500 hover:text-blue-600">
        &larr; Back to promo codes
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New promo code</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Codes are stored uppercase and matched case-insensitively at checkout.
      </p>
      <PromoForm
        mode="create"
        defaults={{
          code: "",
          discountType: "PERCENT",
          discountValue: 50,
          applicablePlans: [],
          maxUses: null,
          maxUsesPerUser: 1,
          expiresAt: null,
          isActive: true,
          paymobLinkBasic: "",
          paymobLinkPro: "",
          paymobLinkPremium: "",
          notes: "",
        }}
      />
    </div>
  );
}
