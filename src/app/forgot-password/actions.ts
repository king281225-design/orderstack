"use server";

import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/data/password-reset";

export type ForgotPasswordState = { submitted: boolean; error: string | null };

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { submitted: false, error: "Enter your email address." };
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const resetUrlBase = `${protocol}://${host}/reset-password`;

  // Always the same outcome regardless of whether the email matched an
  // account — see requestPasswordReset's own comment.
  await requestPasswordReset(email, resetUrlBase);

  return { submitted: true, error: null };
}
