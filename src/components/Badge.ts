import { styled, tw } from "classname-variants/preact";

// A small status pill: the high-score annotations (`clean`, `piggy`), the
// end-game result milestones (`best`) and the transient `+35` bonus chip
// (`gold`). `tone` carries the whole colour treatment (fill, text, ring, weight,
// emboss); the shape is shared, so a new status is one entry here rather than
// another inline class soup.
export const Badge = styled("span", {
  base: tw`inline-flex items-center rounded-full`,
  variants: {
    tone: {
      // high-score list annotations
      clean: tw`bg-emerald-100 font-semibold text-emerald-700 ring-1 ring-emerald-600/20`,
      piggy: tw`bg-primary-100 font-medium text-primary-500`,
      // end-game (embossed, sit on the results card): `best` is every result
      // milestone (kept off gold so it doesn't fight the coins); `gold` is the
      // transient +35 bonus chip.
      gold: tw`emboss bg-amber-300 font-semibold text-amber-900 ring-1 ring-amber-500/50`,
      best: tw`emboss bg-emerald-100 font-semibold text-emerald-700 ring-1 ring-emerald-600/30`,
    },
    // `md` is the default annotation pill; `sm` is the tighter, bolder chip used
    // for floating call-outs (e.g. the "+35" bonus chip on the results row).
    size: {
      md: tw`px-2 py-0.5 text-caption`,
      sm: tw`px-1.5 py-px text-xs`,
    },
  },
  defaultVariants: { size: "md" },
});
