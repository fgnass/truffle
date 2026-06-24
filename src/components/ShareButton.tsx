import { Share2 } from "lucide-preact";
import { i18n } from "../state";
import { Button } from "./Button";

// `tone` picks the surface the share link sits on, instead of every call site
// passing the full colour treatment as a className: `overlay` is the on-purple
// look (translucent white), `light` the purple-on-light look (e.g. the settings
// sheet). Shared chrome (gap, size, weight) stays here.
const TONE = {
  overlay: "emboss-dark text-white/70 hover:text-white",
  light: "text-primary-700 hover:text-primary-900",
};

export function ShareButton({ tone = "overlay" }: { tone?: keyof typeof TONE }) {
  const data = { url: location.href };
  if (!navigator.canShare?.(data)) return null;
  return (
    <Button
      intent="ghost"
      class={`gap-1.5 text-base font-medium ${TONE[tone]}`}
      onClick={() => navigator.share(data)}
    >
      <Share2 />
      {i18n.value.shareWithFriends}
    </Button>
  );
}
