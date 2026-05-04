import Link from "next/link";
import RequestResetForm from "./RequestResetForm";

export const metadata = { title: "Forgot password — MedExam Hub" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter the email address you signed up with and we&apos;ll send you a link to set
        a new password.
      </p>
      <RequestResetForm />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
