import { ComponentChildren } from "preact";

// The full-screen dimmed, blurred backdrop shared by every dialog and sheet:
// one place that owns the scrim look (ink wash + blur) and the tap-to-dismiss.
// Wrap the dialog's card — which should stop click propagation — as the child.
export function Overlay({
  onClose,
  class: cls = "",
  children,
}: {
  onClose: () => void;
  class?: string;
  children: ComponentChildren;
}) {
  return (
    <div
      class={`fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-5 backdrop-blur-md animate-fadeIn ${cls}`}
      onClick={onClose}
    >
      {children}
    </div>
  );
}
