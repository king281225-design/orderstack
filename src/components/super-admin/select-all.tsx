"use client";

/** Header checkbox that ticks every row checkbox (name="id") on the page. */
export function SelectAllCheckbox() {
  return (
    <input
      type="checkbox"
      aria-label="Select all restaurants on this page"
      className="h-4 w-4 cursor-pointer accent-indigo-600"
      onChange={(e) => {
        document
          .querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]')
          .forEach((box) => (box.checked = e.target.checked));
      }}
    />
  );
}
