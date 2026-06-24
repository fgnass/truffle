export function PigAvatar(props: { class?: string }) {
  return (
    <img
      src="/piggy-avatar.svg"
      alt=""
      aria-hidden="true"
      class={props.class}
      draggable={false}
    />
  );
}
