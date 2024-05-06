import { Fragment } from "preact";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "./icons";
import { Signal, computed, useSignal } from "@preact/signals";
import { players } from "./state";

const people = ["Elmar", "Felix", "Miri", "Paula"];

const notPlaying = computed(() =>
  people.filter(
    (name) => !players.value.find((player) => player.name.value === name)
  )
);

type Props = {
  selected: Signal<string | null>;
};
export default function PlayerNameInput({ selected }: Props) {
  const query = useSignal("");

  const filteredPeople =
    query.value === ""
      ? notPlaying.value
      : notPlaying.value.filter((person) =>
          person
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.value.toLowerCase().replace(/\s+/g, ""))
        );

  return (
    <Combobox value={selected.value} onChange={(v) => (selected.value = v)}>
      <div className="relative">
        <div className="relative">
          <Combobox.Input
            autoComplete="off"
            className="w-full border rounded border-primary-600 py-2 pl-3 pr-10 text-sm"
            onChange={(event: any) => {
              query.value = event.target.value;
            }}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => (query.value = "")}
        >
          <Combobox.Options
            hidden={!filteredPeople.length}
            className="absolute mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 shadow ring-1 ring-black/5 focus:outline-none1"
          >
            <Combobox.Option value={query.value}>{query.value}</Combobox.Option>
            {filteredPeople.map((name) => (
              <Combobox.Option
                key={name}
                className={({ active }) =>
                  `cursor-default select-none py-2 px-4 mx-1 flex gap-1 items-center ${
                    active ? "bg-primary-700 text-white" : "text-gray-900"
                  }`
                }
                value={name}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {name}
                    </span>
                    {selected ? (
                      <span
                        className={active ? "text-white" : "text-primary-600"}
                      >
                        <CheckIcon />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
}
