import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "./icons";
import { Signal, useSignal } from "@preact/signals";
import { tw, variants } from "classname-variants";

const optionClass = variants({
  base: tw`cursor-default select-none py-2 px-4 mx-1 flex gap-1 items-center`,
  variants: {
    active: {
      true: tw`bg-primary-700 text-white`,
      false: tw`text-gray-900`,
    },
  },
});

type Props = {
  options: string[];
  selected: Signal<string | null>;
};
export default function AutoComplete({ options, selected }: Props) {
  const query = useSignal("");
  const v = query.value;
  const filteredOptions =
    v === ""
      ? options
      : options.filter((value) =>
          value
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(v.toLowerCase().replace(/\s+/g, ""))
        );

  if (v && !filteredOptions.includes(v)) {
    filteredOptions.unshift(v);
  }
  console.log(filteredOptions);

  return (
    <Combobox
      immediate
      value={selected.value}
      onChange={(v) => (selected.value = v)}
    >
      <div className="relative">
        <div className="relative">
          <ComboboxInput
            autoComplete="off"
            className="w-full border rounded border-primary-600 py-2 pl-3 pr-10 text-sm"
            onChange={(event: any) => {
              const v = event.target.value.trim();
              query.value = v.charAt(0).toUpperCase() + v.slice(1);
            }}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon />
          </ComboboxButton>
        </div>
        <ComboboxOptions className="empty:hidden absolute mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 shadow ring-1 ring-black/5 focus:outline-none1">
          {filteredOptions.map((name) => (
            <ComboboxOption key={name} className={optionClass} value={name}>
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
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
