import { styled, tw } from "classname-variants/preact";

export const Button = styled("button", {
  base: tw`rounded-full inline-flex gap-1 text-[1.1em] justify-center items-center`,
  variants: {
    secondary: {
      true: tw`bg-neutral-200 text-black`,
      false: tw`bg-primary-700 text-white`,
    },
    circle: {
      true: tw`size-[3em]`,
      false: tw`px-[1.5em] py-[1em]`,
    },
  },
});
