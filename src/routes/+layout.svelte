<script lang="ts">
  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public";
  import { load } from "@apple/mapkit-loader";

  import "../app.css";
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

<slot />
