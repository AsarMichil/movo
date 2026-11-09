<script lang="ts">
  import { toast } from "svelte-sonner"

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link")
    }
  }
</script>

<button
  type="button"
  onclick={copy}
  class="h-11 shrink-0 cursor-pointer bg-ink px-3.5 text-sm font-extrabold text-bg"
>
  Copy link
</button>
