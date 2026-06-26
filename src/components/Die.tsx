import _ from "lodash";

const Pip = () => <div class="pip" />;

const Die = ({
  value = 0,
  selected = false,
  flat = false,
  stampDelay,
  onPress,
}: {
  value?: number;
  selected?: boolean;
  flat?: boolean;
  // Per-die delay (ms) for the deal-in cascade, staggered across the freshly
  // thrown dice so a die pops in relative to the other new dice, not its
  // absolute slot. Omitted on flat dice, which don't animate.
  stampDelay?: number;
  onPress?: (value: number) => unknown;
}) => {
  return (
    <button
      type="button"
      class={flat ? "die die-flat" : "die"}
      data-selected={selected}
      disabled={!onPress}
      onClick={onPress?.bind(this, value)}
      style={
        stampDelay === undefined
          ? undefined
          : ({ "--stamp-delay": `${stampDelay}ms` } as Record<string, string>)
      }
      aria-label={value ? `Die showing ${value}` : "Empty die"}
    >
      {_.range(value).map((i) => (
        <Pip key={i} />
      ))}
    </button>
  );
};

export default Die;
