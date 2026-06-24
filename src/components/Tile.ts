import { styled, tw } from "classname-variants/preact";

// The shared roster/seat tile: a rounded card holding an avatar + label, used by
// the player picker and the online seat grids. `state` owns the ring / glow /
// dim that signals selection or availability — branch here, not with a ternary
// in the JSX. Padding, gap and the active-press belong to the call site, since
// the picker and the seat grids size their tiles differently.
export const Tile = styled("button", {
  base: tw`relative flex flex-col items-center rounded-2xl transition`,
  variants: {
    state: {
      // Player picker: unselected vs. selected (with a soft glow).
      off: tw`ring-1 ring-black/5`,
      on: tw`shadow-[0_0_10px_1px_rgba(139,92,246,0.5)] ring-2 ring-primary-500 ring-offset-2`,
      // Seat grids: your own seat, a free seat, a claimed seat, and seats that
      // can't be taken yet (host hasn't picked / guest already chose).
      mine: tw`ring-2 ring-primary-500`,
      open: tw`ring-1 ring-primary-300 active:scale-95`,
      taken: tw`opacity-100`,
      dim: tw`opacity-40`,
      locked: tw`opacity-50`,
      // The roster's "add player" affordance: a dashed outline instead of a
      // filled tile, content centred since it has no avatar to top-align.
      add: tw`justify-center border-2 border-dashed border-primary-300 text-primary-700`,
    },
  },
  defaultVariants: { state: "off" },
});

// The check disc pinned to a selected/claimed tile's corner. `select` is the
// picker's purple badge; `claim` is the smaller green one on a taken seat.
export const TileBadge = styled("span", {
  base: tw`absolute grid place-items-center rounded-full text-white ring-2 ring-white`,
  variants: {
    tone: {
      select: tw`-top-2 -right-2 size-6 bg-primary-600 shadow-md`,
      claim: tw`-top-1 -right-1 size-5 bg-emerald-500`,
    },
  },
});
