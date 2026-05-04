import Link from "next/link";
import { peekResetToken } from "@/lib/email";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Reset password — MedExam Hub" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  // Light validity check before showing the form. The full check (including
  // verifying the password-hash fingerprint) happens on form submit.
  const peeked = token ? peekResetToken(token) : null;
  const linkLooksValid = !!peeked;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>

      {!linkLooksValid ? (
        <>
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">This reset link is invalid or expired.</p>
            <p className="mt-1">
              Reset links work only once and expire after 1 hour. Request a new one below.
            </p>
          </div>
          <p className="mt-6 text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-blue-600 hover:underline"
            >
              Request a new reset link →
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Choose a new password. After saving, you&apos;ll be signed in automatically.
          </p>
          <ResetPasswordForm token={token} />
        </>
      )}
    </div>
  );
}
