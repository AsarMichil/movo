<script lang="ts">
  import TripLayout from "../components/TripLayout.svelte"
  import type { PageProps } from "./$types"
  import { extractParameters } from "$lib/url-params"
  import { page } from "$app/state"
  import { browser } from "$app/environment"

  const { data }: PageProps = $props()

  // The page is prerendered, so the query string only exists in the browser.
  const shared = browser ? extractParameters(page.url) : null
</script>

<TripLayout homezones={data.homezones} {shared} />
