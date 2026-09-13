"use client";

import { useState } from "react";
import { deleteCategoryAction, renameCategoryAction } from "@/app/dashboard/menu/actions";

export function CategoryHeader({
  categoryId,
  name,
}: {
  categoryId: string;
  name: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await renameCategoryAction(categoryId, String(formData.get("name") ?? ""));
          setEditing(false);
        }}
        className="mb-3 flex items-center gap-2"
      >
        <input
          name="name"
          defaultValue={name}
          autoFocus
          required
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-gray-900">{name}</h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-gray-700 hover:underline"
        >
          Rename
        </button>
      </div>
      <form action={deleteCategoryAction.bind(null, categoryId)}>
        <button
          type="submit"
          className="text-xs font-medium text-red-600 hover:underline"
          title="Deletes the category and all its items"
        >
          Delete category
        </button>
      </form>
    </div>
  );
}
