import { styled, tw } from "classname-variants/preact";

// A round icon button. `tone` picks the surface it sits on: `light` for cards
// and dialogs (a soft purple disc), `overlay` for the app's purple gradient
// backdrop (a translucent white disc). `raised` adds the subtle drop shadow used
// when the button floats above a light surface (the in-game undo/settings discs).
// Replaces the hand-rolled close / back / gear / undo buttons across the app.
export const IconButton = styled("button", {
  base: tw`grid place-items-center rounded-full transition active:scale-90`,
  variants: {
    tone: {
      light: tw`bg-primary-100 text-primary-700`,
      overlay: tw`bg-white/15 text-white hover:bg-white/25`,
    },
    size: {
      sm: tw`size-8`,
      md: tw`size-9`,
      lg: tw`size-10`,
    },
    raised: {
      true: tw`shadow-subtle`,
    },
  },
  defaultVariants: { tone: "light", size: "md" },
});
