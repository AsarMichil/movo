<script lang="ts">
  import { Moon, Sun, Monitor } from "@lucide/svelte"
  import { themeContext } from "../lib/theme-context.svelte"
</script>

<button
  onclick={() => themeContext.toggle()}
  class="rounded-md bg-gray-200 p-2 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
  aria-label="Toggle theme"
  title={themeContext.theme === "light"
    ? "Light mode"
    : themeContext.theme === "dark"
      ? "Dark mode"
      : "System theme"}
>
  {#if themeContext.theme === "light"}
    <Sun class="h-5 w-5 text-gray-800 dark:text-gray-200" />
  {:else if themeContext.theme === "dark"}
    <Moon class="h-5 w-5 text-gray-800 dark:text-gray-200" />
  {:else}
    <Monitor class="h-5 w-5 text-gray-800 dark:text-gray-200" />
  {/if}
</button>
