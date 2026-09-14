"use server";

import { resetPasswordWithToken } from "@/lib/data/password-reset";

export type ResetPasswordState = { success: boolean; error: string | null };

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { success: false, error: "This reset link is missing its token." };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { success: false, error: "Passwords don't match." };
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, error: null };
}
