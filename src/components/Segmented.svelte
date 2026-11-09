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
  class="flex border-2 border-rule bg-surface"
>
  {#each options as option (option.value)}
    <ToggleGroup.Item
      value={option.value}
      class="min-h-11 flex-1 cursor-pointer border-l border-hair px-4 text-sm font-bold whitespace-nowrap text-muted first:border-l-0 data-[state=on]:bg-ink data-[state=on]:text-bg"
    >
      {option.label}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
