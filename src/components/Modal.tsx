import { ChevronLeft, X } from "lucide-preact";
import { ComponentChildren } from "preact";
import { i18n } from "../state";
import { IconButton } from "./IconButton";
import { Overlay } from "./Overlay";
import { stitchedCard } from "./card";

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
    <Overlay onClose={onClose}>
      <div
        class={`relative p-5 text-ink animate-popIn ${stitchedCard} ${cls}`}
        onClick={(e) => e.stopPropagation()}
      >
        {onBack && (
          <IconButton
            size="sm"
            onClick={onBack}
            aria-label={t.back}
            class="absolute left-3 top-3"
          >
            <ChevronLeft class="size-5" />
          </IconButton>
        )}
        <IconButton
          size="sm"
          onClick={onClose}
          aria-label={t.close}
          class="absolute right-3 top-3"
        >
          <X class="size-5" />
        </IconButton>
        {children}
      </div>
    </Overlay>
  );
}
