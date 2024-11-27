export type PlanType = 'free' | 'base' | 'pro'

// Add plan limits constant
export const PLAN_REQUEST_LIMITS = {
  free: 10,
  base: 200,
  pro: 1000
} as const

// user_profile table
export interface UserProfile {
  id: string // UUID
  first_name: string | null
  last_name: string | null
  google_permissions_set: boolean
  microsoft_permissions_set: boolean
  permissions_setup_completed: boolean
  plan: PlanType
  allow_sheet_modification: boolean
  show_sheet_modification_warning: boolean
}

// user_usage table
export interface UserUsage {
  id: string // UUID
  recent_urls: string[]
  recent_queries: string[]
  requests_this_week: number
  requests_this_month: number
  requests_previous_3_months: number
}

// error_messages table
export interface ErrorMessage {
  id: string // UUID
  user_id: string // UUID
  message: string
  created_at: string // ISO timestamp
  error_code: string | null
  resolved: boolean
}

// query_history table
export interface QueryHistory {
  id: string // UUID
  user_id: string // UUID
  query_text: string
  created_at: string // ISO timestamp
  response_text: string | null
  processing_time_ms: number | null
  status: string
  tokens_used: number | null
}


// user_documents_access table
export interface UserDocumentsAccess {
  user_id: string // UUID
  provider: string
  access_token: string
  refresh_token: string
  expires_at: string // ISO timestamp
  token_type: string
  scope: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}
