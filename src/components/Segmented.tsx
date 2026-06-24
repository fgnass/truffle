import { ComponentChildren } from "preact";
import { styled, tw } from "classname-variants/preact";

// One segment of the pill toggle. The active/inactive look lives in the `active`
// variant rather than a ternary in the JSX below.
const Segment = styled("button", {
  base: tw`flex-1 rounded-full px-3 py-1.5 transition`,
  variants: {
    active: {
      true: tw`emboss bg-white text-primary-800`,
      false: tw`text-white/80`,
    },
  },
});

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
        <Segment
          key={i}
          active={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Segment>
      ))}
    </div>
  );
}
