import { ComponentChildren } from "preact";
import { Toggle } from "./Toggle";

// A settings row: a label on the left, a Toggle pinned to the right. Used in the
// Setup screen and the Piggy hint. `class` styles the row (gap, padding, text
// size/colour — which the label inherits), `labelClass` the label span, and
// `toggleClass` sizes the switch.
export function ToggleRow({
  label,
  checked,
  onChange,
  class: className = "gap-3",
  labelClass,
  toggleClass,
}: {
  label: ComponentChildren;
  checked: boolean;
  onChange: (value: boolean) => void;
  class?: string;
  labelClass?: string;
  toggleClass?: string;
}) {
  return (
    <label class={`flex items-center justify-between ${className}`}>
      <span class={labelClass}>{label}</span>
      <Toggle class={toggleClass} checked={checked} onChange={onChange} />
    </label>
  );
}
