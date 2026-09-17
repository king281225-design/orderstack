import type { Metadata } from "next";
import { BUSINESS_NAME } from "@/lib/contact";

export const metadata: Metadata = { title: "About Us · BhojSetu" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-gray-700 dark:text-gray-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">About Us</h1>

      <p className="mt-6">
        BhojSetu is an ordering platform built for restaurants — a public menu page your
        customers can order from, a live order dashboard for your kitchen and staff, and
        billing, coupons, analytics and staff tools behind it. Each restaurant gets its own
        storefront link and its own fully isolated menu, orders, and customer data.
      </p>

      <p className="mt-4">
        Restaurants use BhojSetu for dine-in QR ordering, takeaway, and delivery — customers
        pay by UPI QR code or cash on delivery, no app download required on either side.
      </p>

      <p className="mt-4">BhojSetu is built and operated by {BUSINESS_NAME}.</p>

      <p className="mt-4">
        Have questions before signing up? See our{" "}
        <a href="/contact" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Contact Us
        </a>{" "}
        page.
      </p>
    </div>
  );
}
