<script lang="ts">
  import { untrack } from "svelte"
  import { MediaQuery } from "svelte/reactivity"
  import type { Homezone } from "../types/evo"
  import type { SharedTrip } from "../lib/url-params"
  import DesktopShell from "./DesktopShell.svelte"
  import MobileShell from "./MobileShell.svelte"
  import TripMap from "./TripMap.svelte"
  import { TripPlanner } from "./trip-planner.svelte"

  type Props = { homezones: Homezone[]; shared: SharedTrip | null }

  let { homezones, shared }: Props = $props()

  const planner = untrack(() => new TripPlanner(homezones, shared))

  // Both shells render and CSS shows the right one, so the prerendered first paint is right at any width.
  // The query only picks which shell mounts the single TripForm; the server guesses desktop.
  const isDesktop = new MediaQuery("(min-width: 768px)", true)

  let top = $state(0)
  let bottom = $state(0)
  let left = $state(0)
</script>

<div class="relative h-full w-full overflow-hidden">
  <TripMap
    {homezones}
    origin={planner.origin}
    destination={planner.destination}
    originIsCurrentLocation={planner.form.originIsCurrentLocation}
    trip={planner.activeTrip}
    calculating={planner.calculating}
    insets={{ top, bottom, left }}
    onReady={(mapkit) => planner.start(mapkit)}
  />
  <MobileShell {planner} active={!isDesktop.current} bind:top bind:bottom />
  <DesktopShell {planner} active={isDesktop.current} bind:left />
</div>
