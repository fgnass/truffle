import { ChevronLeft, X } from "lucide-preact";
import { ComponentChildren } from "preact";
import { i18n } from "../state";
import { IconButton } from "./IconButton";
import { Dialog } from "./Dialog";

// A floating stitched card over a blurred, dimmed backdrop. Backdrop tap or the
// close button dismisses it; an optional back button steps to a previous modal
// (e.g. from a player's stats back to the high-score list). Width/extra layout
// is the caller's job via `class`.
export function Modal({
  onClose,
  onBack,
  class: cls = "",
  children,
}: {
  onClose: () => void;
  onBack?: () => void;
  class?: string;
  children: ComponentChildren;
}) {
  const t = i18n.value;
  return (
    <Dialog onClose={onClose} class={`relative p-5 ${cls}`}>
      {onBack && (
        <IconButton
          size="sm"
          onClick={onBack}
          aria-label={t.back}
          class="absolute top-3 left-3"
        >
          <ChevronLeft class="size-5" />
        </IconButton>
      )}
      <IconButton
        size="sm"
        onClick={onClose}
        aria-label={t.close}
        class="absolute top-3 right-3"
      >
        <X class="size-5" />
      </IconButton>
      {children}
    </Dialog>
  );
}
