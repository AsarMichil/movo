<script lang="ts">
  import { mk } from "../lib/mapkit";
  import { getErrorMessage } from "../lib/errors";
  import type { FormEventHandler } from "svelte/elements";
  import { fly } from "svelte/transition";
  import { debounced } from "$lib/debounce";
  import { createCombobox, melt } from "@melt-ui/svelte";
  import { toast } from "svelte-sonner";
  import { load } from "@apple/mapkit-loader";
  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public";

  type Props = {
    label: string;
    value: any | undefined;
    placeholder?: string;
    onLocationSelected?: (coordinate: any, isCurrentLocation: boolean) => void;
    onInput: () => void;
  };

  let {
    label: labelText,
    value = $bindable(),
    placeholder,
    onLocationSelected,
    onInput
  }: Props = $props();

  let results = $state<any[]>([]);
  let errorMessage = $state<string>();
  let showLocationOption = $state(false);
  let isRequestingLocation = $state(false);

  let controller: AbortController | undefined;

  const fetchResults = debounced(200, (query: string, signal: AbortSignal) =>
    mk.search.autocomplete(query, { signal }).then(
      (newResults) => {
        results = newResults;
      },
      (error) => {
        if (signal.aborted) return;
        errorMessage = getErrorMessage(error, "Failed to fetch results");
      },
    ),
  );

  const handleInput: FormEventHandler<HTMLInputElement> = async (event) => {
    onInput()
    const input = event.currentTarget.value;
    showLocationOption = false;
    controller?.abort();
    if (input.length === 0) {
      results = [];
      return;
    }
    controller = new AbortController();
    fetchResults(input, controller.signal);
  };

  const handleFocus = () => {
    if ($inputValue.length === 0) {
      showLocationOption = true;
    }
  };

  const handleBlur = () => {
    // Delay to allow click on location button to register
    setTimeout(() => {
      showLocationOption = false;
    }, 200);
  };

  async function requestUserLocation() {
    if (isRequestingLocation) return;

    isRequestingLocation = true;

    try {
      const mapkit = await load({
        token: PUBLIC_MAPKIT_TOKEN,
        language: "en-US",
      });

      if (!navigator.geolocation) {
        toast.error("Location not supported", {
          description: "Your browser does not support geolocation.",
        });
        isRequestingLocation = false;
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordinate = new mapkit.Coordinate(
            position.coords.latitude,
            position.coords.longitude,
          );

          if (onLocationSelected) {
            onLocationSelected(coordinate, true);
          }

          $inputValue = "Current location";
          value = {
            coordinate,
            displayLines: ["Current location"],
          };

          isRequestingLocation = false;
          showLocationOption = false;
        },
        (error) => {
          console.error("Geolocation error:", error);

          if (error.code === error.PERMISSION_DENIED) {
            toast.error("Location access denied", {
              description:
                "Movo does not have access to your location. Please enable location access in your browser's site settings if you want to use this feature.",
              duration: 6000,
            });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error("Location unavailable", {
              description:
                "Your location is currently unavailable. Please try again later.",
            });
          } else if (error.code === error.TIMEOUT) {
            toast.error("Location request timed out", {
              description:
                "The request to get your location timed out. Please try again.",
            });
          } else {
            toast.error("Location error", {
              description: "An error occurred while getting your location.",
            });
          }

          isRequestingLocation = false;
          showLocationOption = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } catch (error) {
      console.error("Error loading MapKit:", error);
      toast.error("Error", {
        description: "Failed to load location services.",
      });
      isRequestingLocation = false;
    }
  }

  const items = $derived(
    results.map((result) => {
      const label = result.displayLines.join(" ");
      const id = result.id ?? crypto.randomUUID();
      return {
        id,
        value: result,
        option: {
          label,
          value: id,
        },
      };
    }),
  );

  const {
    elements: { label, input, menu, option },
    states: { open, inputValue },
  } = createCombobox<string>({
    forceVisible: true,
    onSelectedChange: ({ next }) => {
      if (!next) return;
      const item = items.find((item) => item.id === next.value);
      $inputValue = item?.option.label ?? "";
      value = item?.value;
      if (onLocationSelected && item?.value?.coordinate) {
        onLocationSelected(item.value.coordinate, false);
      }
      return next;
    },
  });
</script>

<div class="relative">
  <label use:melt={$label} class="hidden md:block text-sm text-gray-700 dark:text-gray-300">
    {labelText}
  </label>
  <input
    use:melt={$input}
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
    type="text"
    class=" border-2 border-gray-800 dark:border-gray-600 p-1 md:px-2 md:py-3 bg-transparent text-gray-800 dark:text-gray-100 w-full"
    {placeholder}
  />

  {#if showLocationOption && !isRequestingLocation}
    <ul
      transition:fly={{ y: -10, duration: 100 }}
      class="absolute top-full left-0 right-0 z-200 bg-white dark:bg-gray-800 border-2 border-gray-800 dark:border-gray-600 shadow-2xl p-2 mt-1"
    >
      <li>
        <button
          type="button"
          onclick={requestUserLocation}
          class="w-full text-left p-2 rounded-md cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Use my location</span>
        </button>
      </li>
    </ul>
  {/if}

  {#if showLocationOption && isRequestingLocation}
    <ul
      transition:fly={{ y: -10, duration: 100 }}
      class="absolute top-full left-0 right-0 z-200 bg-white dark:bg-gray-800 border-2 border-gray-800 dark:border-gray-600 shadow-2xl p-2 mt-1"
    >
      <li class="p-2 text-gray-600 dark:text-gray-400">Getting your location...</li>
    </ul>
  {/if}

  {#if $open && results.length > 0}
    <ul
      use:melt={$menu}
      transition:fly={{ y: -10, duration: 100 }}
      class="absolute top-full left-0 right-0 z-200 bg-white dark:bg-gray-800 border-2 border-gray-800 dark:border-gray-600 shadow-2xl p-2 min-h-64 max-h-80 overflow-y-auto mt-1"
    >
      {#each items as item (item.id)}
        <li
          use:melt={$option(item.option)}
          class="p-2 rounded-md cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700 data-highlighted:bg-orange-50 dark:data-highlighted:bg-gray-700 text-gray-800 dark:text-gray-100"
        >
          {#each item.value.displayLines as line, index (index)}
            <p class:text-sm={index !== 0}>{line}</p>
          {/each}
        </li>
      {/each}
    </ul>
  {/if}
</div>
