import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">OrderStack</h1>
      <p className="max-w-md text-sm text-gray-500">
        Real ordering for real restaurants. Ask your platform operator for a login, or if you&apos;re a
        customer, use the ordering link your restaurant gave you (e.g. <code>/r/your-restaurant</code>).
      </p>
      <Link
        href="/login"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
      >
        Restaurant / admin sign in
      </Link>
    </div>
  );
}
