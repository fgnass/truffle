import { featureColor, PIGGY_FEATURE_COLOR } from "./avatar";

// The player's name in the handwritten logo font, coloured to match their
// avatar (a darkened shade of its background via `featureColor`) — or the brand
// violet for Piggy. This is the label half of the avatar/name pair
// (`PlayerAvatar` is the other half): it owns the `font-logo` + `leading-none`
// treatment and the one piggy-vs-human colour rule that was re-typed across the
// roster, the lobby seat grids, the live strip and the stats card. Width
// clamping (`truncate max-w-*`) stays with each call site via `class`.
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "text-sm", // strip + lobby/seat grids
  md: "text-base", // roster picker tiles
  lg: "text-2xl", // stats card headline
};

export function PlayerName({
  name,
  piggy = false,
  size = "sm",
  class: cls = "",
}: {
  name: string;
  piggy?: boolean;
  size?: Size;
  class?: string;
}) {
  const color = piggy ? PIGGY_FEATURE_COLOR : featureColor(name);
  return (
    <span style={{ color }} class={`font-logo leading-none ${SIZE[size]} ${cls}`}>
      {name}
    </span>
  );
}
