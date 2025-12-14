<script lang="ts">
  import { Toaster } from "svelte-sonner"
  import { themeContext } from "../lib/theme-context.svelte"
  import { browser } from "$app/environment"

  import "../app.css"
  let { children } = $props()

  $effect(() => {
    if (browser) {
      document.documentElement.classList.toggle("dark", themeContext.isDarkMode)
    }
  })
</script>

<svelte:head>
  <!-- <script
    src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js"
    crossorigin="anonymous"
    async
    data-callback="initMapKit"
    data-libraries="map,services,user-location,annotations,geojson,overlays"
    data-token={PUBLIC_MAPKIT_TOKEN}
  ></script> -->
</svelte:head>

<Toaster />
{@render children()}
