"use client";

import { useActionState, useState } from "react";
import { submitSupportTicketAction, type SupportFormState } from "@/app/dashboard/help/actions";

type Option = { value: string; label: string; hint?: string };

const initial: SupportFormState = { error: null };
const MAX_BYTES = 5 * 1024 * 1024;

const fieldCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      <span>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs font-normal text-gray-500">{hint}</span>}
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

export function SupportForm({
  restaurantName,
  responseTarget,
  categories,
  priorities,
  areas,
  defaults,
}: {
  restaurantName: string;
  responseTarget: string;
  categories: Option[];
  priorities: Option[];
  areas: string[];
  defaults: { name: string; phone: string; email: string };
}) {
  const [state, action, pending] = useActionState(submitSupportTicketAction, initial);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [priority, setPriority] = useState("NORMAL");
  const fe = state.fieldErrors ?? {};

  if (state.ticketNumber) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-400/30 dark:bg-green-500/10">
        <p className="text-base font-semibold text-green-900 dark:text-green-200">
          ✓ Request sent — ticket #{state.ticketNumber}
        </p>
        <p className="text-sm text-green-900/80 dark:text-green-200/80">
          Our team aims to respond within {responseTarget}. You&apos;ll see the status and our reply in &quot;Your
          requests&quot; below, and we&apos;ll email you when there&apos;s an update.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormKey((k) => k + 1);
            setPriority("NORMAL");
          }}
          className="text-sm font-medium text-green-900 underline dark:text-green-200"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-gray-500">
        Restaurant: <span className="font-medium text-gray-800">{restaurantName}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What do you need help with?" required error={fe.category}>
          <select name="category" required defaultValue="" className={fieldCls}>
            <option value="" disabled>
              Choose a topic…
            </option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How urgent is it?" required error={fe.priority}>
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={fieldCls}
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {priority === "URGENT" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          For urgent problems, also call or WhatsApp us using the buttons above — it&apos;s the fastest way.
        </p>
      )}

      <Field label="Subject" required error={fe.subject} hint="A one-line summary, e.g. “Orders not showing on dashboard”">
        <input name="subject" required maxLength={150} className={fieldCls} />
      </Field>

      <Field
        label="Describe the problem or question"
        required
        error={fe.description}
        hint="What happened? What did you expect? Any error message? The more detail, the faster we can fix it."
      >
        <textarea name="description" required rows={5} maxLength={5000} className={fieldCls} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where in the app?" error={fe.area}>
          <select name="area" defaultValue="" className={fieldCls}>
            <option value="">Not sure / not applicable</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Related order number" error={fe.orderNumber} hint="Optional — if it's about a specific order">
          <input name="orderNumber" inputMode="numeric" placeholder="e.g. 1042" className={fieldCls} />
        </Field>
      </div>

      <Field
        label="Screenshot"
        error={fileError ?? fe.screenshot}
        hint="Optional but very helpful — PNG or JPG, up to 5 MB."
      >
        <input
          name="screenshot"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size > MAX_BYTES) {
              setFileError("That file is over 5 MB.");
              e.target.value = "";
            } else {
              setFileError(null);
            }
          }}
          className="text-sm"
        />
      </Field>

      <hr className="border-gray-100" />
      <h3 className="text-sm font-semibold text-gray-900">How can we reach you?</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={fe.contactName}>
          <input name="contactName" required defaultValue={defaults.name} autoComplete="name" className={fieldCls} />
        </Field>
        <Field label="Phone / WhatsApp number" required error={fe.contactPhone}>
          <input
            name="contactPhone"
            type="tel"
            required
            defaultValue={defaults.phone}
            autoComplete="tel"
            className={fieldCls}
          />
        </Field>
        <Field label="Email" required error={fe.contactEmail}>
          <input
            name="contactEmail"
            type="email"
            required
            defaultValue={defaults.email}
            autoComplete="email"
            className={fieldCls}
          />
        </Field>
        <Field label="Best way to contact you" required error={fe.preferredContact}>
          <select name="preferredContact" defaultValue="PHONE" className={fieldCls}>
            <option value="PHONE">Phone call</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          </select>
        </Field>
        <Field label="Best time to reach you" error={fe.bestTime} hint="Optional, e.g. “after 3 PM”">
          <input name="bestTime" maxLength={60} className={fieldCls} />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || Boolean(fileError)}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send to support team"}
        </button>
        <span className="text-xs text-gray-500">We aim to respond within {responseTarget}.</span>
      </div>
    </form>
  );
}
