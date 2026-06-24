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
  base: "inline-flex px-[1em] items-center rounded-full transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  variants: {
    on: {
      true: "bg-primary-700",
      false: "bg-primary-200",
    },
  },
});

const Knob = styled("span", {
  base: "inline-block size-[2em] m-[3px] transform rounded-full bg-white transition",
  variants: {
    on: {
      true: "translate-x-[1em]",
      false: "translate-x-[-1em]",
    },
  },
});
