import type { ComponentChildren } from "preact";

// Shared heading for dialogs and sheets: the logo font in a light periwinkle
// fill lifted off the card by a dark offset shadow (see `.title-drop` in
// index.css), so the title pops the way the mascot logo pops off the backdrop.
// Callers pass only extra layout classes (e.g. the Intro arrow row).
export function DialogTitle({
  class: cls = "",
  children,
}: {
  class?: string;
  children: ComponentChildren;
}) {
  return (
    <h2 class={`title-drop font-logo text-2xl text-primary-700 ${cls}`}>
      {children}
    </h2>
  );
}
