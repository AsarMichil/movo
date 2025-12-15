<script lang="ts">
  import TripLayout from "../components/TripLayout.svelte";
  import type { PageProps } from "./$types";
  import { setTripContext } from "../lib/trip-context.svelte";
  import { extractParams } from "$lib/url-params";
  import { page } from "$app/state";
  const { data }: PageProps = $props();

  const urlParams = extractParams(page.params);

  setTripContext(urlParams);
</script>

<main>
  <TripLayout homezones={data.homezones} />
</main>
