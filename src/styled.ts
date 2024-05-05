import { styled, tw } from "classname-variants/preact";

export const Button = styled("button", {
  base: tw` rounded-2xl px-4 py-2 inline-flex gap-1`,
  variants: {
    secondary: {
      true: tw`bg-neutral-200 text-black`,
      false: tw`bg-primary-700 text-white`,
    },
  },
});
