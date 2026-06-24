import { styled, tw } from "classname-variants/preact";

// Shared chrome for the three "solid" looks (pill text size, weight, the subtle
// lift and the press). `ghost` opts out of all of it — it's a bare text/icon
// button whose colour, size and padding come from the call site.
const solid = tw`gap-1 text-[1.05em] font-semibold shadow-subtle active:scale-[0.98]`;

export const Button = styled("button", {
  base: tw`rounded-full inline-flex justify-center items-center transition disabled:opacity-50 disabled:active:scale-100`,
  variants: {
    intent: {
      primary: `${solid} bg-primary-700 text-white shadow-primary-950/20 emboss-dark`,
      secondary: `${solid} bg-white text-black ring-1 ring-neutral-200 emboss`,
      danger: `${solid} bg-red-700 text-white shadow-red-950/20 emboss-dark`,
      ghost: tw`active:scale-95`,
    },
    circle: {
      true: tw`size-[3em]`,
      false: "",
    },
  },
  // Pill padding applies to the solid intents only; ghost stays padding-free.
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
  ],
  defaultVariants: { intent: "primary", circle: false },
});
