import { styled, tw } from "classname-variants/preact";

// A small status pill: the high-score annotations (`clean`, `piggy`) and the
// end-game score milestones (`gold`, `best`, `first`). `tone` carries the whole
// colour treatment (fill, text, ring, weight, emboss); the shape is shared, so
// a new status is one entry here rather than another inline class soup.
export const Badge = styled("span", {
  base: tw`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem]`,
  variants: {
    tone: {
      // high-score list annotations
      clean: tw`bg-emerald-100 text-emerald-700 font-semibold ring-1 ring-emerald-600/20`,
      piggy: tw`bg-primary-100 text-primary-500 font-medium`,
      // end-game milestones (embossed, sit on the white results card)
      gold: tw`bg-amber-300 text-amber-900 font-semibold ring-1 ring-amber-500/50 emboss`,
      best: tw`bg-emerald-100 text-emerald-700 font-semibold ring-1 ring-emerald-600/30 emboss`,
      first: tw`bg-primary-100 text-primary-600 font-semibold ring-1 ring-primary-300/60 emboss`,
    },
  },
});
