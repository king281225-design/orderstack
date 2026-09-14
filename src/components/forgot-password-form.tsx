"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ForgotPasswordState } from "@/app/forgot-password/actions";

const initialState: ForgotPasswordState = { submitted: false, error: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.submitted) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-700">
          If that email has an account, we&apos;ve sent a password reset link to it. Check your
          inbox (and spam folder) for an email from BhojSetu.
        </p>
        <Link href="/login" className="text-sm font-medium text-gray-900 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/login" className="text-center text-sm text-gray-500 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
