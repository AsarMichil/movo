<script lang="ts" generics="T extends string">
  import { ToggleGroup } from "bits-ui"

  type Props = {
    label: string
    options: { value: T; label: string }[]
    value: T
    onChange: (value: T) => void
  }

  let { label, options, value, onChange }: Props = $props()
</script>

<ToggleGroup.Root
  type="single"
  aria-label={label}
  bind:value={
    () => value,
    (next) => {
      const option = options.find((option) => option.value === next)
      if (option) onChange(option.value)
    }
  }
  class="inline-flex w-full rounded-md border-2 border-gray-800 p-0.5 dark:border-gray-600"
>
  {#each options as option (option.value)}
    <ToggleGroup.Item
      value={option.value}
      class="flex-1 cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-gray-600 data-[state=on]:bg-gray-800 data-[state=on]:text-white dark:text-gray-300 dark:data-[state=on]:bg-gray-600"
    >
      {option.label}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
