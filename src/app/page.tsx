import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BhojSetuLogo } from "@/components/brand/logo";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <BhojSetuLogo markSize={40} textClassName="text-2xl font-semibold text-gray-900" />
      <p className="max-w-md text-sm text-gray-500">
        Real ordering for real restaurants. Have a restaurant? Set up your own storefront below. If
        you&apos;re a customer, use the ordering link your restaurant gave you (e.g.{" "}
        <code>/r/your-restaurant</code>).
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Set up your restaurant
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
