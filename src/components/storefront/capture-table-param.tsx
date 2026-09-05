"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";

/**
 * A table's QR code links to /r/<slug>?table=<label>. This captures that
 * once on landing and hands it to the cart context, which persists it
 * (localStorage, same durability as the cart itself) so it survives the
 * navigation to /checkout even though the query param doesn't. Renders
 * nothing — it's a side-effect-only component.
 */
export function CaptureTableParam() {
  const searchParams = useSearchParams();
  const { setTableLabel } = useCart();
  const table = searchParams.get("table");

  useEffect(() => {
    if (table) setTableLabel(table);
  }, [table, setTableLabel]);

  return null;
}
