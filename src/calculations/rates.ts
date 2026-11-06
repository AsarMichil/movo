export type MembershipFee = {
  label: string
  amount: number
  per: "once" | "month" | "year"
  note?: string
}

type Rates = {
  evo: {
    effective: string
    source: string
    perMinute: number
    perHour: number
    perDay: number
    packages: readonly { days: number; price: number }[]
    allAccessFee: number
    bcaaDiscount: number
    membership: readonly MembershipFee[]
  }
  modo: {
    effective: string
    source: string
    perKm: number
    innovationFee: { ev: number; nonEv: number }
    overnight: { startHour: number; endHour: number; maxBilledHours: number }
    fuelSurchargeAbovePerLitre: number
    dayTripperPrice: Partial<Record<string, number>>
    plans: Record<
      string,
      {
        hourly: Record<string, number>
        dayTripperKm: number
        membership: readonly MembershipFee[]
      }
    >
  }
  taxes: { gst: number; pst: number }
  pvrt: {
    perPeriod: number
    overMinutes: number
    periodMinutes: number
    exemptFromMinutes: number
  }
}

export const RATES = {
  evo: {
    effective: "2026-03-01",
    source: "https://evo.ca/rates",
    perMinute: 0.49,
    perHour: 17.99,
    perDay: 104.99,
    packages: [
      { days: 1, price: 104.99 },
      { days: 3, price: 264.99 },
      { days: 5, price: 424.99 },
    ],
    allAccessFee: 1.85,
    bcaaDiscount: 0.1,
    membership: [
      {
        label: "Registration",
        amount: 35,
        per: "once",
        note: "Free for BCAA members",
      },
      { label: "Car share operator fee", amount: 2, per: "year" },
    ],
  },
  modo: {
    effective: "2026-11-06",
    source: "https://www.modo.coop/get-a-plan",
    perKm: 0.35,
    innovationFee: { ev: 1, nonEv: 3 },
    fuelSurchargeAbovePerLitre: 2.11,
    overnight: { startHour: 21, endHour: 7, maxBilledHours: 3 },
    dayTripperPrice: { daily_drive: 100, large_loadable: 135 },
    plans: {
      plus: {
        hourly: { daily_drive: 5, large_loadable: 7, oversized: 10 },
        dayTripperKm: 500,
        membership: [
          {
            label: "Member share",
            amount: 500,
            per: "once",
            note: "Refundable",
          },
          { label: "Admin fee", amount: 1, per: "year" },
        ],
      },
      monthly: {
        hourly: { daily_drive: 6, large_loadable: 8, oversized: 11 },
        dayTripperKm: 250,
        membership: [{ label: "Admin fee", amount: 6, per: "month" }],
      },
    },
  },
  taxes: { gst: 0.05, pst: 0.07 },
  pvrt: {
    perPeriod: 1.5,
    overMinutes: 8 * 60,
    periodMinutes: 24 * 60,
    exemptFromMinutes: 28 * 24 * 60,
  },
} as const satisfies Rates

export type ModoPlan = keyof typeof RATES.modo.plans
export type VehicleClass = keyof (typeof RATES.modo.plans)[ModoPlan]["hourly"]
export type DayTripperVehicle = keyof typeof RATES.modo.dayTripperPrice

export const MODO_PLAN_LABELS: Record<ModoPlan, string> = {
  plus: "Modo Plus",
  monthly: "Modo Monthly",
}

export function hasDayTripper(
  vehicle: VehicleClass,
): vehicle is DayTripperVehicle {
  return vehicle in RATES.modo.dayTripperPrice
}
