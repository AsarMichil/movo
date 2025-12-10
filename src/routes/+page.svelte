<script lang="ts">
  import TripLayout from "../components/TripLayout.svelte"
  import type { PageProps } from "./$types"
  import { setTripContext } from "../lib/trip-context.svelte"

  const { data }: PageProps = $props()

  setTripContext(data.urlParams)
</script>

<TripLayout homezones={data.homezones} />
