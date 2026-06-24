import { ComponentChildren } from "preact";
import { Overlay } from "./Overlay";
import { StitchedCard } from "./card";

// The shared dialog scaffold: a popped-in stitched card centred over a dismissing
// backdrop, with the click-eating that keeps a tap on the card from closing it.
// One home for the `Overlay > StitchedCard pop + stopPropagation` trio that the
// settings sheet, the reset confirm and the Piggy hint all need. `Modal` builds
// on this and adds the close/back buttons; callers that want a different header
// (or none) use `Dialog` directly. Layout (width, padding, gap) is the caller's
// job via `class`.
export function Dialog({
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
    <Overlay onClose={onClose} scrim={scrim}>
      <StitchedCard pop class={cls} onClick={(e: Event) => e.stopPropagation()}>
        {children}
      </StitchedCard>
    </Overlay>
  );
}
