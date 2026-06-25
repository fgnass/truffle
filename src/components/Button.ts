import { styled, tw } from "classname-variants/preact";

// Shared chrome for the three "solid" looks (weight, the subtle lift and the
// press). Text size is the `size` axis below, not baked in here, so call sites
// pick `sm`/`md` instead of overriding with `!text-sm`. `ghost` opts out of all
// of it — it's a bare text/icon button whose colour, size and padding come from
// the call site.
const solid = tw`gap-1 font-semibold shadow-hard active:scale-[0.98]`;

export const Button = styled("button", {
  base: tw`inline-flex items-center justify-center rounded-full transition disabled:opacity-50 disabled:active:scale-100`,
  variants: {
    intent: {
      primary: `${solid} bg-primary-700 text-white shadow-primary-950/20`,
      secondary: `${solid} bg-white text-ink`,
      danger: `${solid} bg-red-700 text-white shadow-red-950/20`,
      // A tonal (purple-on-light) pill — quieter than `secondary`, no shadow.
      // Used for low-emphasis actions on a light surface (e.g. the lobby's
      // "copy link"). Its own gap/size/weight since it isn't a `solid` look.
      soft: tw`gap-2 bg-primary-100 text-sm font-medium text-primary-700 active:scale-95`,
      ghost: tw`active:scale-95`,
    },
    circle: {
      // A round button whose diameter matches the solid pill's height (its
      // py-[0.9em] + text line ≈ 3.43rem at the default text size), so a circle
      // button sits next to a pill as a matched pair. In rem, not em, so the
      // intent's own text size (e.g. `soft`'s text-sm) can't shrink it.
      true: tw`size-[3.43rem]`,
      false: "",
    },
    // Text size for the solid pills. The classes are emitted per-intent below
    // (the `soft`/`ghost` looks carry their own size), so this axis is just a
    // marker here.
    size: {
      sm: "",
      md: "",
    },
  },
  // Pill padding + text size apply to the solid intents only; `ghost` stays
  // bare and `soft` keeps its own sizing.
  compoundVariants: [
    {
      variants: { intent: "primary", circle: false },
      className: tw`px-[1.45em] py-[0.9em]`,
    },
    {
      variants: { intent: "secondary", circle: false },
      className: tw`px-[1.45em] py-[0.9em]`,
    },
    {
      variants: { intent: "danger", circle: false },
      className: tw`px-[1.45em] py-[0.9em]`,
    },
    {
      variants: { intent: "soft", circle: false },
      className: tw`px-4 py-2`,
    },
    // Solid text sizes: `md` is the default pill size, `sm` the compact one.
    { variants: { intent: "primary", size: "md" }, className: tw`text-[1.05em]` },
    { variants: { intent: "secondary", size: "md" }, className: tw`text-[1.05em]` },
    { variants: { intent: "danger", size: "md" }, className: tw`text-[1.05em]` },
    { variants: { intent: "primary", size: "sm" }, className: tw`text-sm` },
    { variants: { intent: "secondary", size: "sm" }, className: tw`text-sm` },
    { variants: { intent: "danger", size: "sm" }, className: tw`text-sm` },
  ],
  defaultVariants: { intent: "primary", circle: false, size: "md" },
});
