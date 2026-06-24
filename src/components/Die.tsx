import _ from "lodash";

const Pip = () => <div class="pip" />;

const Die = ({
  value = 0,
  selected = false,
  flat = false,
  onPress,
}: {
  value?: number;
  selected?: boolean;
  flat?: boolean;
  onPress?: (value: number) => unknown;
}) => {
  return (
    <button
      type="button"
      class={flat ? "die die-flat" : "die"}
      data-selected={selected}
      disabled={!onPress}
      onClick={onPress?.bind(this, value)}
      aria-label={value ? `Die showing ${value}` : "Empty die"}
    >
      {_.range(value).map((i) => (
        <Pip key={i} />
      ))}
    </button>
  );
};

export default Die;
