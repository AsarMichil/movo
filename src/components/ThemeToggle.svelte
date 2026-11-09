<script lang="ts">
  import { Moon, Sun, Monitor } from "@lucide/svelte"
  import { themeContext } from "../lib/theme-context.svelte"
</script>

<button
  type="button"
  onclick={() => themeContext.toggle()}
  class="grid size-11 cursor-pointer place-items-center border-2 border-rule bg-surface text-ink"
  aria-label="Toggle theme"
  title={themeContext.theme === "light"
    ? "Light mode"
    : themeContext.theme === "dark"
      ? "Dark mode"
      : "System theme"}
>
  {#if themeContext.theme === "light"}
    <Sun class="size-5" />
  {:else if themeContext.theme === "dark"}
    <Moon class="size-5" />
  {:else}
    <Monitor class="size-5" />
  {/if}
</button>
