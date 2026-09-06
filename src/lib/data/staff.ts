import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export class EmailTakenError extends Error {}

export async function listStaffForTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, role: "STAFF" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true },
  });
}

export async function createStaffAccount(tenantId: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new EmailTakenError(`Email "${email}" is already in use.`);

  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { tenantId, email, passwordHash, role: "STAFF" },
  });
}

/** Scoped by tenantId AND role: STAFF so this can never be pointed at an owner or another tenant's account. */
export async function deleteStaffAccount(tenantId: string, userId: string) {
  return prisma.user.deleteMany({ where: { id: userId, tenantId, role: "STAFF" } });
}
