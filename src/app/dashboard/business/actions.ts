"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError, createSession, generateSessionId, requireOwnerSession } from "@/lib/auth";
import { setUserActiveSession } from "@/lib/data/sessions";
import {
  assertOwnerCanAccessStore,
  createStoreForBusiness,
  renameBusinessStore,
  setBusinessStoreStatus,
  BusinessAccessError,
  MultiStoreNotAllowedError,
} from "@/lib/data/business";
import { SlugTakenError } from "@/lib/data/tenants";

/**
 * Makes `storeId` the active store. The only way a session's tenantId ever
 * changes for a normal owner: the target is looked up in the database and
 * must belong to the Business this user owns — a forged/guessed id from
 * another business (or a standalone store) is rejected. Super-admin
 * "managing" sessions can't use this (they have their own mechanism).
 */
export async function switchStoreAction(storeId: string) {
  const session = await requireOwnerSession();
  if (session.impersonatorId) throw new AuthError("Not available while managing a restaurant as admin.");
  const store = await assertOwnerCanAccessStore(session.sub, storeId);
  const sid = generateSessionId();
  await setUserActiveSession(session.sub, sid);
  await createSession({ sub: session.sub, role: "OWNER", tenantId: store.id, email: session.email, sid });
  console.info(`[business] ${session.email} switched to store ${store.slug}`);
  redirect("/dashboard");
}

export type AddStoreState = { error: string | null; success: boolean };

export async function addStoreAction(_prev: AddStoreState, formData: FormData): Promise<AddStoreState> {
  const session = await requireOwnerSession();
  if (session.impersonatorId) return { error: "Not available while managing as admin.", success: false };
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || !slug) return { error: "Store name and link are required.", success: false };
  try {
    await createStoreForBusiness(session.sub, session.tenantId, { name, slug });
  } catch (err) {
    if (err instanceof SlugTakenError || err instanceof BusinessAccessError || err instanceof MultiStoreNotAllowedError) {
      return { error: err.message, success: false };
    }
    return { error: err instanceof Error ? err.message : "Could not add the store.", success: false };
  }
  revalidatePath("/dashboard/business");
  return { error: null, success: true };
}

export async function setStoreStatusAction(storeId: string, status: "ACTIVE" | "SUSPENDED") {
  const session = await requireOwnerSession();
  if (session.impersonatorId) throw new AuthError("Not available while managing as admin.");
  await setBusinessStoreStatus(session.sub, storeId, status);
  revalidatePath("/dashboard/business");
}

export async function renameStoreAction(storeId: string, formData: FormData) {
  const session = await requireOwnerSession();
  if (session.impersonatorId) throw new AuthError("Not available while managing as admin.");
  await renameBusinessStore(session.sub, storeId, String(formData.get("name") ?? ""));
  revalidatePath("/dashboard/business");
}

