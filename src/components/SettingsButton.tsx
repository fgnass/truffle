import { Settings as GearIcon } from "lucide-preact";
import { ComponentProps } from "preact";
import { i18n, settingsOpen } from "../state";
import { IconButton } from "./IconButton";

// The always-present gear. Defaults to the on-purple (overlay) style; pass
// `tone="light"` (plus `size`/`raised`) to restyle it for a light surface, e.g.
// the in-game card header.
export function SettingsButton(props: ComponentProps<typeof IconButton>) {
  return (
    <IconButton
      tone="overlay"
      onClick={() => (settingsOpen.value = true)}
      aria-label={i18n.value.settingsTitle}
      {...props}
    >
      <GearIcon class="size-5" />
    </IconButton>
  );
}
