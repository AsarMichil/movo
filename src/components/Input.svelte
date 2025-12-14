<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = {
    labelText: string;
    placeholder: string;
  } & HTMLInputAttributes;

  let {
    labelText,
    placeholder,
    value = $bindable(),
    ...rest
  }: Props = $props();
</script>

<div>
  <label class="hidden md:block text-sm text-gray-700 dark:text-gray-300" for={rest.id}>
    {labelText}
  </label>
  <input
    bind:value
    {...rest}
    type="text"
    class=" border-2 border-gray-800 dark:border-gray-600 p-1 md:px-2 md:py-3 bg-transparent text-gray-800 dark:text-gray-100 w-full"
    {placeholder}
  />
</div>
