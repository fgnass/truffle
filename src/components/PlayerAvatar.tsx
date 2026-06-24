import { JSX } from "preact";
import { avatarFor } from "./avatar";
import { PigAvatar } from "./PigAvatar";

// One round player avatar. Picks the source from `piggy`: the computer opponent
// renders the brand mascot (PigAvatar), everyone else their hashed Dicebear face
// (avatarFor). `size` is the finite set of diameters the app actually uses, so
// the avatar/name pair stops being re-typed (with a slightly different size each
// time) at every seat grid, roster tile, strip and results row.
type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  xs: "size-7", // live online standings strip
  sm: "size-11", // results ceremony rows (matches the rank coins)
  md: "size-11", // lobby seat grids
  lg: "size-12", // roster picker tiles
  xl: "size-16", // player stats card
};

export function PlayerAvatar({
  name,
  piggy = false,
  size = "md",
  class: cls = "",
  style,
}: {
  name: string;
  piggy?: boolean;
  size?: Size;
  class?: string;
  style?: JSX.CSSProperties;
}) {
  const className = `${SIZE[size]} rounded-full ${cls}`;
  return piggy ? (
    <PigAvatar class={className} style={style} />
  ) : (
    <img
      src={avatarFor(name)}
      alt=""
      draggable={false}
      class={className}
      style={style}
    />
  );
}
