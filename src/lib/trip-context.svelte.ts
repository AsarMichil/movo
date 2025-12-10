import { getContext, setContext } from "svelte"
import type { ComparisonResult } from "../calculations"
import type { TripParamsUrl } from "./url-params"

export interface TripStore {
  params: TripParamsUrl | null
  calculations: ComparisonResult | null
  isCalculating: boolean
}

class TripContext {
  params = $state<TripParamsUrl | null>(null)
  calculations = $state<ComparisonResult | null>(null)
  isCalculating = $state(false)

  setParams(params: TripParamsUrl | null) {
    this.params = params
  }

  setCalculations(calculations: ComparisonResult | null) {
    this.calculations = calculations
  }

  setIsCalculating(isCalculating: boolean) {
    this.isCalculating = isCalculating
  }
}

const TRIP_CONTEXT_KEY = Symbol("trip-context")

export function setTripContext(initialParams: TripParamsUrl | null = null): TripContext {
  const context = new TripContext()
  context.setParams(initialParams)
  setContext(TRIP_CONTEXT_KEY, context)
  return context
}

export function getTripContext(): TripContext {
  const context = getContext<TripContext>(TRIP_CONTEXT_KEY)
  if (!context) {
    throw new Error("Trip context not found. Make sure setTripContext is called in a parent component.")
  }
  return context
}
