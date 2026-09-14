"use client";

import { useActionState, useState } from "react";
import { updateDeliveryZoneAction, type DeliveryZoneState } from "@/app/dashboard/branding/actions";

const initialState: DeliveryZoneState = { error: null, success: false };

export function DeliveryZoneForm({
  latitude,
  longitude,
  deliveryRadiusKm,
}: {
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateDeliveryZoneAction, initialState);
  const [lat, setLat] = useState(latitude != null ? String(latitude) : "");
  const [lng, setLng] = useState(longitude != null ? String(longitude) : "");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  function useMyLocation() {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location — allow location access, or enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Delivery zone (optional)</h3>
      <p className="mb-3 text-xs text-gray-500">
        Set a radius and customers outside it see a warning at checkout (it never blocks their
        order — you still get to decide). Uses the customer&apos;s own device location, so it
        works best on mobile and only when they allow it; there&apos;s no address-lookup service
        behind this.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Delivery radius (km)
            <input
              name="deliveryRadiusKm"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={deliveryRadiusKm ?? ""}
              placeholder="e.g. 3"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 28.6139"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 77.2090"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="w-fit rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {locating ? "Locating…" : "📍 Use my current location"}
          </button>
          <span className="text-xs text-gray-400">Stand at your restaurant when you click this.</span>
        </div>
        {locateError && <p className="text-sm text-red-600">{locateError}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-green-600">Saved.</p>}
    </div>
  );
}
