import { ComponentChildren } from "preact";

// A two-or-more option pill toggle, white-on-purple — the scope switch used on
// the Stats screen and the end-of-game leaderboard. The active segment is a
// solid white pill; the rest are muted. Generic over the option value so callers
// can switch on strings, booleans, etc.
export function Segmented<T>({
  options,
  value,
  onChange,
  class: cls = "",
}: {
  options: { value: T; label: ComponentChildren }[];
  value: T;
  onChange: (value: T) => void;
  class?: string;
}) {
  return (
    <div
      class={`flex gap-1 rounded-full bg-white/15 p-1 text-sm font-semibold ${cls}`}
    >
      {options.map((o, i) => (
        <button
          key={i}
          onClick={() => onChange(o.value)}
          class={`flex-1 rounded-full px-3 py-1.5 transition ${
            o.value === value
              ? "bg-white text-primary-800 emboss"
              : "text-white/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
