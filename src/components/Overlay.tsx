import { ComponentChildren } from "preact";
import { styled, tw } from "classname-variants/preact";

// The full-screen dimmed, blurred backdrop shared by every dialog and sheet:
// one place that owns the scrim look (ink wash + blur) and the tap-to-dismiss.
// Wrap the dialog's card — which should stop click propagation — as the child.
// `scrim` picks the wash: the default heavy blur for full-screen dialogs, or
// `soft` (a lighter dim + blur) for the in-game Piggy hint, where the board
// behind should stay readable.
const Scrim = styled("div", {
  base: tw`fixed inset-0 z-50 flex animate-fadeIn items-center justify-center p-5`,
  variants: {
    scrim: {
      default: tw`bg-ink/30 backdrop-blur-md`,
      soft: tw`bg-primary-950/40 backdrop-blur-[2px]`,
    },
  },
  defaultVariants: { scrim: "default" },
});

export function Overlay({
  onClose,
  scrim = "default",
  class: cls = "",
  children,
}: {
  onClose: () => void;
  scrim?: "default" | "soft";
  class?: string;
  children: ComponentChildren;
}) {
  return (
    <Scrim scrim={scrim} class={cls} onClick={onClose}>
      {children}
    </Scrim>
  );
}
