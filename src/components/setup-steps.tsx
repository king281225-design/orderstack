const STEPS = ["Create account", "Add your menu", "Set your branding"];

export function SetupSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div aria-label={`Step ${current} of ${STEPS.length}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        Step {current} of {STEPS.length}
      </p>
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={label} className="flex flex-1 flex-col gap-1">
              <span
                className={`h-1.5 rounded-full ${done || active ? "bg-indigo-600" : "bg-gray-200"}`}
              />
              <span className={`text-[11px] leading-tight ${active ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                {done ? "✓ " : ""}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
