export type PlanType = 'free' | 'base' | 'pro'

// Add plan limits constant
export const PLAN_REQUEST_LIMITS = {
  free: 10,
  base: 200,
  pro: 1000
} as const

export const PLAN_IMAGE_LIMITS = {
  free: 5,
  base: 100,
  pro: 500
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
  recent_urls: string[] // max length: 3
}

// user_usage table
export interface UserUsage {
  user_id: string // UUID
  requests_this_week: number
  requests_this_month: number
  images_processed_this_month: number
  requests_previous_3_months: number
}

// error_log table
export interface ErrorLog {
  id: string // UUID
  user_id: string // UUID
  original_query: string | null
  file_names: string[]
  doc_names: string[]
  message: string
  created_at: string // ISO timestamp
  error_code: string | null
}

// request_log table
export interface RequestLog {
  id: string // UUID
  user_id: string // UUID
  query: string
  file_names: string[]
  doc_names: string[]
  created_at: string // ISO timestamp
  processing_time_ms: number | null
  status: string
  success: boolean
}


// user_documents_access table
export interface UserDocumentsAccess {
  user_id: string // UUID
  provider: string //Google or Microsoft
  access_token: string
  refresh_token: string
  expires_at: string // ISO timestamp
  token_type: string
  scope: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}
