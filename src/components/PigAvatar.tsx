import { JSX } from "preact";

export function PigAvatar(props: {
  class?: string;
  style?: JSX.CSSProperties;
}) {
  return (
    <img
      src="/piggy-avatar.svg"
      alt=""
      aria-hidden="true"
      class={props.class}
      style={props.style}
      draggable={false}
    />
  );
}
