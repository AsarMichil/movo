<script lang="ts">
  import { mk } from "../lib/mapkit";
  import { getErrorMessage } from "../lib/errors";
  import type { FormEventHandler } from "svelte/elements";
  import { fly } from "svelte/transition";
  import { debounced } from "$lib/debounce";
  import { createCombobox, melt } from "@melt-ui/svelte";

  type Props = {
    label: string
    value: any | undefined
    placeholder?: string
  }

  let { label: labelText, value = $bindable(), placeholder }: Props = $props()

  let results = $state<any[]>([])
  let errorMessage = $state<string>();

  let controller: AbortController | undefined;

  const fetchResults = debounced(200, (query: string, signal: AbortSignal) =>
    mk.search.autocomplete(query, { signal }).then(
      (newResults) => {
        results = newResults;
      },
      (error) => {
        if (signal.aborted) return;
        errorMessage = getErrorMessage(error, "Failed to fetch results");
      },
    ),
  );

  const handleInput: FormEventHandler<HTMLInputElement> = async (event) => {
    const input = event.currentTarget.value;
    controller?.abort();
    controller = new AbortController();
    fetchResults(input, controller.signal);
  };

  const items = $derived(
    results.map((result) => {
      const label = result.displayLines.join(" ");

      return {
        id: label,
        value: result,
        option: {
          label,
          value: label,
        },
      };
    }),
  );

  const {
    elements: { label, input, menu, option },
    states: { open, inputValue },
  } = createCombobox<string>({
    forceVisible: true,
    onSelectedChange: ({ next }) => {
      if (!next) return;
      const item = items.find((item) => item.id === next.value);
      $inputValue = item?.option.label ?? "";
      value = item?.value;
      return next;
    },
  });
</script>

<div>
  <label use:melt={$label} class="hidden md:block text-sm text-gray-700">
    {labelText}
  </label>
  <input
    use:melt={$input}
    oninput={handleInput}
    type="text"
    class=" border-2 border-gray-800 p-1 md:px-2 md:py-3 bg-transparent w-full"
    {placeholder}
  />
</div>

{#if $open && results.length > 0}
  <ul
    use:melt={$menu}
    transition:fly={{ y: -10, duration: 150 }}
    class="bg-white border-2 border-gray-800 shadow-2xl p-2 min-h-64 max-h-80 overflow-y-auto"
  >
    {#each items as item (item.id)}
      <li
        use:melt={$option(item.option)}
        class="p-2 rounded-md cursor-pointer hover:bg-orange-50 data-highlighted:bg-orange-50"
      >
        {#each item.value.displayLines as line, index (index)}
          <p class:text-sm={index !== 0}>{line}</p>
        {/each}
      </li>
    {/each}
  </ul>
{/if}
