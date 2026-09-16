"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, generateSessionId, verifyPassword } from "@/lib/auth";
import { setUserActiveSession } from "@/lib/data/sessions";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  // Single-device enforcement (Starter/Advanced tenants — see
  // src/lib/data/sessions.ts): this login becomes the account's one valid
  // session from here on, silently superseding any older login elsewhere.
  const sid = generateSessionId();
  await setUserActiveSession(user.id, sid);

  await createSession({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
    email: user.email,
    sid,
  });

  if (user.role === "SUPER_ADMIN") redirect("/super-admin");
  redirect("/dashboard");
}
