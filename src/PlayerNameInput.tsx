import { Signal, useComputed, useSignal } from "@preact/signals";
import { players } from "./state";
import AutoComplete from "./AutoComplete";
import { useEffect } from "preact/hooks";
import alasql from "alasql";

type Props = {
  selected: Signal<string | null>;
};
export default function PlayerNameInput({ selected }: Props) {
  const knownPlayers = useSignal([]);
  useEffect(() => {
    alasql("select name from players", undefined, (rows) => {
      knownPlayers.value = rows.map((row: { name: string }) => row.name);
    });
  }, []);

  const notPlaying = useComputed(() =>
    knownPlayers.value.filter(
      (name) => !players.value.find((player) => player.name.value === name)
    )
  );

  return <AutoComplete options={notPlaying.value} selected={selected} />;
}
