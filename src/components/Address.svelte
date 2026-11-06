<script lang="ts">
  import { mk } from "../lib/mapkit"
  import { getErrorMessage } from "../lib/errors"
  import type { FormEventHandler } from "svelte/elements"
  import { fly } from "svelte/transition"
  import { debounced } from "$lib/debounce"
  import { Combobox } from "bits-ui"
  import { toast } from "svelte-sonner"
  import {
    load,
    type MapKit,
    type SearchAutocompleteResult,
  } from "@apple/mapkit-loader"
  import type { Place } from "./TripTypes"
  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public"

  type Props = {
    label: string
    value: Place | undefined
    placeholder?: string
    onLocationSelected?: (
      coordinate: InstanceType<MapKit["Coordinate"]>,
      isCurrentLocation: boolean,
    ) => void
  }

  let {
    label,
    value = $bindable(),
    placeholder,
    onLocationSelected,
  }: Props = $props()

  const inputId = $props.id()

  let results = $state.raw<SearchAutocompleteResult[]>([])
  // Follows the selected place (also when set from a shared link) until the user types
  let inputValue = $derived(value?.displayLines.join(" ") ?? "")
  let showLocationOption = $state(false)
  let isRequestingLocation = $state(false)

  let controller: AbortController | undefined

  const fetchResults = debounced(200, (query: string, signal: AbortSignal) =>
    mk.search.autocomplete(query, { signal }).then(
      (newResults) => {
        results = newResults
      },
      (error) => {
        if (signal.aborted) return
        toast.error(getErrorMessage(error, "Failed to fetch results"))
      },
    ),
  )

  const items = $derived(
    results.map((result) => ({
      id: result.id ?? crypto.randomUUID(),
      label: result.displayLines.join(" "),
      result,
    })),
  )

  function handleValueChange(id: string) {
    const item = items.find((item) => item.id === id)
    if (!item) return
    value = item.result
    if (onLocationSelected && item.result.coordinate) {
      onLocationSelected(item.result.coordinate, false)
    }
  }

  const handleInput: FormEventHandler<HTMLInputElement> = (event) => {
    inputValue = event.currentTarget.value
    showLocationOption = false
    controller?.abort()
    if (inputValue.length === 0) {
      results = []
      return
    }
    controller = new AbortController()
    fetchResults(inputValue, controller.signal)
  }

  const handleFocus: FormEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.value.length === 0) {
      showLocationOption = true
    }
  }

  const handleBlur = () => {
    // Delay so a click on the location button still registers
    setTimeout(() => {
      showLocationOption = false
    }, 200)
  }

  async function requestUserLocation() {
    if (isRequestingLocation) return

    isRequestingLocation = true

    try {
      const mapkit = await load({
        token: PUBLIC_MAPKIT_TOKEN,
        language: "en-US",
      })

      if (!navigator.geolocation) {
        toast.error("Location not supported", {
          description: "Your browser does not support geolocation.",
        })
        isRequestingLocation = false
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinate = new mapkit.Coordinate(
            position.coords.latitude,
            position.coords.longitude,
          )

          onLocationSelected?.(coordinate, true)

          value = {
            coordinate,
            displayLines: ["Current location"],
          }

          isRequestingLocation = false
          showLocationOption = false
        },
        (error) => {
          console.error("Geolocation error:", error)

          if (error.code === error.PERMISSION_DENIED) {
            toast.error("Location access denied", {
              description:
                "Movo does not have access to your location. Please enable location access in your browser's site settings if you want to use this feature.",
              duration: 6000,
            })
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error("Location unavailable", {
              description:
                "Your location is currently unavailable. Please try again later.",
            })
          } else if (error.code === error.TIMEOUT) {
            toast.error("Location request timed out", {
              description:
                "The request to get your location timed out. Please try again.",
            })
          } else {
            toast.error("Location error", {
              description: "An error occurred while getting your location.",
            })
          }

          isRequestingLocation = false
          showLocationOption = false
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } catch (error) {
      console.error("Error loading MapKit:", error)
      toast.error("Error", {
        description: "Failed to load location services.",
      })
      isRequestingLocation = false
    }
  }
</script>

<div class="relative">
  <label
    for={inputId}
    class="sr-only text-sm text-gray-700 md:not-sr-only md:block dark:text-gray-300"
  >
    {label}
  </label>
  <Combobox.Root
    type="single"
    {inputValue}
    items={items.map(({ id, label }) => ({ value: id, label }))}
    onValueChange={handleValueChange}
  >
    <Combobox.Input
      id={inputId}
      defaultValue={inputValue}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      class="w-full border-2 border-gray-800 bg-transparent p-1 text-gray-800 md:px-2 md:py-3 dark:border-gray-600 dark:text-gray-100"
      {placeholder}
    />

    {#if items.length > 0}
      <Combobox.ContentStatic
        class="absolute top-full right-0 left-0 z-200 mt-1 max-h-80 min-h-64 overflow-y-auto border-2 border-gray-800 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800"
      >
        {#each items as item (item.id)}
          <Combobox.Item
            value={item.id}
            label={item.label}
            class="cursor-pointer rounded-md p-2 text-gray-800 hover:bg-orange-50 data-highlighted:bg-orange-50 dark:text-gray-100 dark:hover:bg-gray-700 dark:data-highlighted:bg-gray-700"
          >
            {#each item.result.displayLines as line, index (index)}
              <p class={{ "text-sm": index !== 0 }}>{line}</p>
            {/each}
          </Combobox.Item>
        {/each}
      </Combobox.ContentStatic>
    {/if}
  </Combobox.Root>

  {#if showLocationOption}
    <ul
      transition:fly={{ y: -10, duration: 100 }}
      class="absolute top-full right-0 left-0 z-200 mt-1 border-2 border-gray-800 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800"
    >
      {#if isRequestingLocation}
        <li class="p-2 text-gray-600 dark:text-gray-400">
          Getting your location...
        </li>
      {:else}
        <li>
          <button
            type="button"
            onclick={requestUserLocation}
            class="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left text-gray-800 hover:bg-orange-50 dark:text-gray-100 dark:hover:bg-gray-700"
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
      {/if}
    </ul>
  {/if}
</div>
