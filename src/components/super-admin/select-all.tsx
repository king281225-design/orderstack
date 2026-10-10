"use client";

/** Header checkbox that ticks every row checkbox (name="id") on the page. */
export function SelectAllCheckbox() {
  return (
    <input
      type="checkbox"
      aria-label="Select all restaurants on this page"
      className="h-5 w-5 touch-manipulation cursor-pointer accent-indigo-600"
      onChange={(e) => {
        document
          .querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]')
          .forEach((box) => (box.checked = e.target.checked));
      }}
    />
  );
}
