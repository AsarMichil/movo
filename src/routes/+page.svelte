<script lang="ts">
  import TripLayout from "../components/TripLayout.svelte"
  import type { PageProps } from "./$types"
  import { setTripContext } from "../lib/trip-context.svelte"
  import { extractParameters } from "$lib/url-params"
  import { page } from "$app/state"
  import { browser } from "$app/environment"
  const { data }: PageProps = $props()

  // The page is prerendered, so the query string only exists in the browser.
  setTripContext(browser ? extractParameters(page.url) : null)
</script>

<TripLayout homezones={data.homezones} />
