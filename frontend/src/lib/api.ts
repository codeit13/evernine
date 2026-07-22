// API client + types mirroring the backend ScoreReport contract.

export interface SignalResult {
  name: string
  present: boolean
  subscore: number | null
  confidence: number
  shrunk_subscore: number | null
  base_weight: number
  effective_weight: number
  prior: number | null
  drivers: Record<string, any>
  notes: string[]
}

export interface GroundednessDetail {
  grounded: boolean
  checked_numbers: number
  unsupported_numbers: number[]
  reason: string
}

export interface ScoreReport {
  business_id: string
  business_name: string
  category: string | null
  composite_score: number
  overall_confidence: number
  confidence_band: string
  coverage: number
  signals: Record<string, SignalResult>
  flags: string[]
  explanation: string
  explanation_source: string
  explanation_grounded: boolean
  groundedness: GroundednessDetail | null
}

export interface BusinessSummary {
  business_id: string
  business_name: string
  category: string
}

export interface HealthInfo {
  status: string
  businesses_loaded: number
  reference_month: string | null
  review_prior_score: number | null
}

// Input payload types (for the Analyze page)
export interface ReviewInput {
  rating: number | null
  text: string
}
export interface SupportTicketsInput {
  total: number
  resolved_within_48h: number
  escalated: number
}
export interface BusinessInput {
  business_id: string
  business_name: string
  category?: string | null
  revenue_by_month: Record<string, number>
  customer_reviews?: ReviewInput[] | null
  repeat_purchase_rate?: number | null
  customer_support_tickets?: SupportTicketsInput | null
  ad_spend_by_month: Record<string, number>
}

const BASE = "/api"

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body?.detail ? JSON.stringify(body.detail) : detail
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => fetch(`${BASE}/health`).then((r) => j<HealthInfo>(r)),

  businesses: () => fetch(`${BASE}/businesses`).then((r) => j<BusinessSummary[]>(r)),

  businessDetail: (id: string) =>
    fetch(`${BASE}/businesses/${encodeURIComponent(id)}`).then((r) => j<BusinessInput>(r)),

  scoreAll: (explain = false) =>
    fetch(`${BASE}/score?explain=${explain}`).then((r) => j<ScoreReport[]>(r)),

  scoreOne: (id: string, explain = true) =>
    fetch(`${BASE}/businesses/${encodeURIComponent(id)}/score?explain=${explain}`).then(
      (r) => j<ScoreReport>(r)
    ),

  scorePayload: (payload: BusinessInput, explain = true) =>
    fetch(`${BASE}/score?explain=${explain}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => j<ScoreReport>(r)),
}
