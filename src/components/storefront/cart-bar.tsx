"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";

export function CartBar({ slug, isOpen }: { slug: string; isOpen: boolean }) {
  const { itemCount, totalCents } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{itemCount}</span> item{itemCount === 1 ? "" : "s"} ·{" "}
          <span className="font-semibold">{formatINR(totalCents)}</span>
        </div>
        {isOpen ? (
          <Link
            href={`/r/${slug}/checkout`}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Checkout
          </Link>
        ) : (
          <span className="text-sm font-medium text-gray-500">Restaurant is closed</span>
        )}
      </div>
    </div>
  );
}
