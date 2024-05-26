import { i18n } from "./state";
import { Button } from "./styled";

export function ShareButton() {
  const data = { url: location.href };
  if (!navigator.canShare?.(data)) return null;
  return (
    <Button secondary onClick={() => navigator.share(data)}>
      {i18n.value.shareWithFriends}
    </Button>
  );
}
