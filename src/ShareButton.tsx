import { i18n } from "./state";
import { Button } from "./styled";

export function ShareButton() {
  if (!navigator.canShare?.()) return null;
  return (
    <Button secondary onClick={() => navigator.share({ url: location.href })}>
      {i18n.value.shareWithFriends}
    </Button>
  );
}
