import { Switch } from "@headlessui/react";
import { styled } from "classname-variants/preact";
import { ComponentProps } from "preact";

type Props = ComponentProps<typeof Switch>;

export function Toggle(props: Props) {
  return (
    <StyledSwitch on={props.checked} {...props}>
      <Knob on={props.checked} />
    </StyledSwitch>
  );
}

const StyledSwitch = styled(Switch, {
  base: "inline-flex px-[1em] pb-[1px] items-center rounded-full shadow-inset",
  variants: {
    on: {
      true: "bg-primary-700",
      false: "bg-neutral-300",
    },
  },
});

const Knob = styled("span", {
  base: "inline-block size-[2em] m-[3px] transform rounded-full bg-white transition shadow-subtle",
  variants: {
    on: {
      true: "translate-x-[1em]",
      false: "translate-x-[-1em]",
    },
  },
});
