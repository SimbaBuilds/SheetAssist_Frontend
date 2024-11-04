export type PlanType = 'free' | 'base' | 'pro'

export interface UserProfile {
  id: string // UUID
  first_name: string | null
  last_name: string | null
  google_permissions_set: boolean
  microsoft_permissions_set: boolean
  plan: PlanType
}

export interface UserUsage {
  id: string // UUID
  recent_urls: string[]
  recent_queries: string[]
  requests_this_week: number
  requests_this_month: number
  requests_previous_3_months: number
}

export interface ErrorMessage {
  id: string // UUID
  user_id: string // UUID
  message: string
  created_at: string // ISO timestamp
  error_code: string | null
  resolved: boolean
}
