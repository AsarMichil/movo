<script lang="ts">
  import { Moon, Sun, Monitor } from "@lucide/svelte"
  import { themeContext } from "../lib/theme-context.svelte"
</script>

<button
  onclick={() => themeContext.toggle()}
  class="p-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
  aria-label="Toggle theme"
  title={themeContext.theme === "light" ? "Light mode" : themeContext.theme === "dark" ? "Dark mode" : "System theme"}
>
  {#if themeContext.theme === "light"}
    <Sun class="w-5 h-5 text-gray-800 dark:text-gray-200" />
  {:else if themeContext.theme === "dark"}
    <Moon class="w-5 h-5 text-gray-800 dark:text-gray-200" />
  {:else}
    <Monitor class="w-5 h-5 text-gray-800 dark:text-gray-200" />
  {/if}
</button>
