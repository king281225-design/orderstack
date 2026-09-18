"use server";

import { redirect } from "next/navigation";
import { createSession, generateSessionId } from "@/lib/auth";
import {
  createTenantWithOwner,
  isValidSlug,
  SlugTakenError,
  EmailTakenError,
} from "@/lib/data/tenants";
import { setUserActiveSession } from "@/lib/data/sessions";

export type SignupState = { error: string | null };

/**
 * Public, unauthenticated: anyone can reach this. No CAPTCHA / rate limiting
 * yet (known gap — see CLAUDE.md), but every field is validated and slug/
 * email uniqueness is enforced the same as the super-admin path.
 */
export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const restaurantName = String(formData.get("restaurantName") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!restaurantName || !slug || !email || !password) {
    return { error: "All fields are required." };
  }
  if (!isValidSlug(slug)) {
    return { error: "Storefront link must be lowercase letters, numbers, and hyphens only." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  let tenant;
  try {
    tenant = await createTenantWithOwner({
      slug,
      name: restaurantName,
      ownerEmail: email,
      ownerPassword: password,
      isOpen: false, // closed until the owner has built a menu and is ready to take orders
    });
  } catch (err) {
    if (err instanceof SlugTakenError) {
      return { error: "That storefront link is already taken — try a different one." };
    }
    if (err instanceof EmailTakenError) {
      return { error: "An account with that email already exists — sign in instead." };
    }
    return { error: err instanceof Error ? err.message : "Could not create your restaurant." };
  }

  const owner = tenant.users[0];
  const sid = generateSessionId();
  await setUserActiveSession(owner.id, sid);
  await createSession({
    sub: owner.id,
    role: owner.role,
    tenantId: owner.tenantId,
    email: owner.email,
    sid,
  });

  redirect("/dashboard/menu");
}
