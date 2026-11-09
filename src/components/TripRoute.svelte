<script lang="ts">
  let { fromLabel, toLabel }: { fromLabel: string; toLabel: string } = $props()
</script>

<dl class="border-2 border-rule bg-surface font-semibold">
  <div class="px-3 py-2">
    <dt class="sr-only">From</dt>
    <dd class="flex min-h-6 items-center gap-2.5">
      <span
        class="size-2.5 shrink-0 rounded-full ring-[3px] ring-ink ring-inset"
        aria-hidden="true"
      ></span>
      {fromLabel}
    </dd>
  </div>
  <div class="border-t border-hair px-3 py-2">
    <dt class="sr-only">To</dt>
    <dd class="flex min-h-6 items-center gap-2.5">
      <span class="size-2.5 shrink-0 bg-ink" aria-hidden="true"></span>
      {toLabel}
    </dd>
  </div>
</dl>
