import _ from "lodash";

const Pip = () => <div class="pip" />;

const Die = ({
  value = 0,
  selected = false,
  onPress,
}: {
  value?: number;
  selected?: boolean;
  onPress?: (value: number) => unknown;
}) => {
  return (
    <div
      class="die"
      data-selected={selected}
      onClick={onPress?.bind(this, value)}
    >
      {_.range(value).map((i) => (
        <Pip key={i} />
      ))}
    </div>
  );
};

export default Die;
