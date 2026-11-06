import { addMinutes, startOfDay } from "date-fns"
import {
  hasDayTripper,
  RATES,
  type CarShareOption,
  type ModoPlan,
  type VehicleClass,
} from "./rates"

export interface TripParameters {
  start_date: Date
  driving_minutes: number // one way
  staying_minutes: number
  distance_km: number // one way
  is_bcaa_member: boolean
  vehicle_preference?: VehicleClass | undefined
  end_is_in_evo_home_zone: boolean
  round_trip_required: boolean
  is_ev?: boolean | undefined
}

export interface CostBreakdown {
  time_cost: number
  distance_cost: number
  fees: number
  taxes: number // GST + PST + PVRT (and GST on PVRT)
  discounts: number
  total: number
  details: string[]
}

export type ComparisonResult = Record<CarShareOption, CostBreakdown> & {
  cheapest_option: CarShareOption
  savings: number // vs the next cheapest option
  distance_km: number
  travel_time_minutes_one_way: number
}

const DAY_MINUTES = 24 * 60
const SALES_TAX = RATES.taxes.gst + RATES.taxes.pst

const money = (amount: number) => `$${amount.toFixed(2)}`
const hoursLabel = (minutes: number) => `${+(minutes / 60).toFixed(2)} h`

export function pvrtCharges(minutes: number): number {
  const { minMinutes, periodMinutes } = RATES.pvrt
  if (minutes < minMinutes) return 0
  return 1 + Math.floor((minutes - minMinutes) / periodMinutes)
}

function taxesFor(taxable: number, charges: number, details: string[]) {
  const salesTax = taxable * SALES_TAX
  details.push(`GST + PST: ${money(salesTax)}`)
  if (charges === 0) return salesTax
  const pvrt = charges * RATES.pvrt.perPeriod
  const pvrtGst = pvrt * RATES.taxes.gst
  details.push(`PVRT: ${charges} × ${money(RATES.pvrt.perPeriod)} + GST ${money(pvrtGst)}`)
  return salesTax + pvrt + pvrtGst
}

type Quote = { cost: number; lines: string[] }

function cheapestDayCover(days: number): { cost: number; packs: number[] } {
  const best = [{ cost: 0, packs: [] as number[] }]
  for (let i = 1; i <= days; i++) {
    const options = RATES.evo.packages.map((pkg) => {
      const prev = best[Math.max(0, i - pkg.days)]!
      return { cost: prev.cost + pkg.price, packs: [...prev.packs, pkg.days] }
    })
    best.push(options.reduce((a, b) => (b.cost < a.cost ? b : a)))
  }
  return best[days]!
}

function dayCoverQuote(days: number): Quote {
  const { cost, packs } = cheapestDayCover(days)
  const lines = RATES.evo.packages.flatMap((pkg) => {
    const count = packs.filter((d) => d === pkg.days).length
    if (count === 0) return []
    const name = pkg.days === 1 ? "day" : `${pkg.days}-day package`
    return [`${count} × ${name} × ${money(pkg.price)} = ${money(count * pkg.price)}`]
  })
  return { cost, lines }
}

function subDayQuote(minutes: number): Quote {
  const { perMinute, perHour, perDay } = RATES.evo
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const restAsHour = rest * perMinute >= perHour
  const restCost = restAsHour ? perHour : rest * perMinute
  const billedHours = hours + (restAsHour ? 1 : 0)
  const cost = hours * perHour + restCost
  if (cost >= perDay) return { cost: perDay, lines: [`1 × day × ${money(perDay)}`] }
  const lines: string[] = []
  if (billedHours > 0) lines.push(`${billedHours} h × ${money(perHour)} = ${money(billedHours * perHour)}`)
  if (rest > 0 && !restAsHour) lines.push(`${rest} min × ${money(perMinute)} = ${money(restCost)}`)
  return { cost, lines }
}

export function evoTimeCost(minutes: number): Quote {
  const days = Math.floor(minutes / DAY_MINUTES)
  const rest = minutes % DAY_MINUTES
  const cover = dayCoverQuote(days)
  const partial = subDayQuote(rest)
  const exact = { cost: cover.cost + partial.cost, lines: [...cover.lines, ...partial.lines] }
  if (rest === 0) return exact
  const roundedUp = dayCoverQuote(days + 1)
  return roundedUp.cost < exact.cost ? roundedUp : exact
}

function evoTrips(params: TripParameters): number[] {
  const drive = Math.ceil(params.driving_minutes)
  const continuous = Math.ceil(params.driving_minutes * 2 + params.staying_minutes)
  if (!params.end_is_in_evo_home_zone) return [continuous]
  if (!params.round_trip_required) return [drive]
  const keepCar = evoCostForTrips([continuous], params.is_bcaa_member)
  const twoTrips = evoCostForTrips([drive, drive], params.is_bcaa_member)
  return twoTrips.total < keepCar.total ? [drive, drive] : [continuous]
}

function evoCostForTrips(trips: number[], isBcaaMember: boolean): CostBreakdown {
  const details: string[] = []
  let timeCost = 0
  for (const [index, minutes] of trips.entries()) {
    const quote = evoTimeCost(minutes)
    if (trips.length > 1) details.push(`Trip ${index + 1} (${minutes} min):`)
    details.push(...quote.lines.map((line) => `  - ${line}`))
    timeCost += quote.cost
  }
  details.push(`  - Total time cost: ${money(timeCost)}`)

  const fees = RATES.evo.allAccessFee * trips.length
  details.push(`All access fee: ${money(fees)}${trips.length > 1 ? ` (×${trips.length} trips)` : ""}`)

  const discounts = isBcaaMember ? timeCost * RATES.evo.bcaaDiscount : 0
  if (discounts > 0) details.push(`BCAA member discount (10%): -${money(discounts)}`)

  const taxable = timeCost - discounts + fees
  const pvrt = trips.reduce((sum, minutes) => sum + pvrtCharges(minutes), 0)
  const taxes = taxesFor(taxable, pvrt, details)

  return {
    time_cost: timeCost,
    distance_cost: 0,
    fees,
    taxes,
    discounts,
    total: taxable + taxes,
    details,
  }
}

export function calculateEvoCost(params: TripParameters): CostBreakdown {
  return evoCostForTrips(evoTrips(params), params.is_bcaa_member)
}

type Interval = { start: number; end: number }

const overlapMinutes = (a: Interval, b: Interval) =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / 60_000

// Within each 9pm-7am window only the first 3 booked hours are billed.
function freeOvernightIntervals(trip: Interval): Interval[] {
  const { startHour, endHour, maxBilledHours } = RATES.modo.overnight
  const first = startOfDay(trip.start)
  const free: Interval[] = []
  for (let offset = -1; ; offset++) {
    const y = first.getFullYear()
    const m = first.getMonth()
    const d = first.getDate() + offset
    const night = { start: new Date(y, m, d, startHour).getTime(), end: new Date(y, m, d + 1, endHour).getTime() }
    if (night.start >= trip.end) return free
    const booked = { start: Math.max(night.start, trip.start), end: Math.min(night.end, trip.end) }
    const freeStart = booked.start + maxBilledHours * 3_600_000
    if (freeStart < booked.end) free.push({ start: freeStart, end: booked.end })
  }
}

export function calculateModoCost(params: TripParameters, plan: ModoPlan): CostBreakdown {
  const vehicle = params.vehicle_preference ?? "daily_drive"
  const { hourly, dayTripperKm } = RATES.modo.plans[plan]
  const rate = hourly[vehicle]
  const { perKm } = RATES.modo

  const minutes = Math.ceil((params.driving_minutes * 2 + params.staying_minutes) / 15) * 15
  const start = params.start_date.getTime()
  const trip = { start, end: addMinutes(params.start_date, minutes).getTime() }
  const free = freeOvernightIntervals(trip)
  const blockCount = Math.max(1, Math.ceil(minutes / DAY_MINUTES))

  const details: string[] = []
  let timeCost = 0
  let distanceCost = 0
  for (let i = 0; i < blockCount; i++) {
    const block = {
      start: start + i * DAY_MINUTES * 60_000,
      end: Math.min(start + (i + 1) * DAY_MINUTES * 60_000, trip.end),
    }
    const blockMinutes = overlapMinutes(block, trip)
    const freeMinutes = free.reduce((sum, interval) => sum + overlapMinutes(block, interval), 0)
    const billedHours = (blockMinutes - freeMinutes) / 60
    const km = (i === 0 ? params.distance_km : 0) + (i === blockCount - 1 ? params.distance_km : 0)
    const prefix = blockCount > 1 ? `Day ${i + 1}: ` : ""

    const hourlyTime = billedHours * rate
    const hourlyDistance = km * perKm
    const dayTripper = hasDayTripper(vehicle)
      ? { time: RATES.modo.dayTripperPrice[vehicle], distance: Math.max(0, km - dayTripperKm) * perKm }
      : null

    if (dayTripper && dayTripper.time + dayTripper.distance < hourlyTime + hourlyDistance) {
      timeCost += dayTripper.time
      distanceCost += dayTripper.distance
      const overage = dayTripper.distance > 0 ? ` + ${km - dayTripperKm} km × ${money(perKm)}` : ""
      details.push(`${prefix}Day Tripper ${money(dayTripper.time)} (${dayTripperKm} km included)${overage}`)
    } else {
      timeCost += hourlyTime
      distanceCost += hourlyDistance
      const overnight = freeMinutes > 0 ? ` (overnight capped, ${hoursLabel(freeMinutes)} free)` : ""
      details.push(`${prefix}${hoursLabel(blockMinutes - freeMinutes)} × ${money(rate)} = ${money(hourlyTime)}${overnight}`)
      details.push(`${prefix}${km} km × ${money(perKm)} = ${money(hourlyDistance)}`)
    }
  }

  const fees = params.is_ev ? RATES.modo.innovationFee.ev : RATES.modo.innovationFee.nonEv
  details.push(`Co-op innovation fee: ${money(fees)} (${params.is_ev ? "EV" : "non-EV"})`)
  details.push("Fuel surcharge not included")

  const subtotal = timeCost + distanceCost + fees
  const taxes = taxesFor(subtotal, pvrtCharges(minutes), details)
  return {
    time_cost: timeCost,
    distance_cost: distanceCost,
    fees,
    taxes,
    discounts: 0,
    total: subtotal + taxes,
    details,
  }
}

export function compareCarShareOptions(params: TripParameters): ComparisonResult {
  const costs: Record<CarShareOption, CostBreakdown> = {
    evo: calculateEvoCost(params),
    modo_plus: calculateModoCost(params, "plus"),
    modo_monthly: calculateModoCost(params, "monthly"),
    modo_business: calculateModoCost(params, "business"),
  }
  const [cheapest, next] = (Object.keys(costs) as CarShareOption[]).sort(
    (a, b) => costs[a].total - costs[b].total,
  ) as [CarShareOption, CarShareOption]

  return {
    ...costs,
    cheapest_option: cheapest,
    savings: costs[next].total - costs[cheapest].total,
    distance_km: params.distance_km,
    travel_time_minutes_one_way: params.driving_minutes,
  }
}
