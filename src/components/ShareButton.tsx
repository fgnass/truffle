import { Share2 } from "lucide-preact";
import { i18n } from "../state";
import { Button } from "./Button";

export function ShareButton({ class: className }: { class?: string }) {
  const data = { url: location.href };
  if (!navigator.canShare?.(data)) return null;
  return (
    <Button
      intent="ghost"
      class={
        className ??
        "emboss-dark gap-1.5 text-base font-medium text-white/70 hover:text-white"
      }
      onClick={() => navigator.share(data)}
    >
      <Share2 />
      {i18n.value.shareWithFriends}
    </Button>
  );
}
