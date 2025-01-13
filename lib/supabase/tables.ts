import { OnlineSheet } from '../types/dashboard'
import { PlanType } from '../constants/pricing'


// user_profile table
export interface UserProfile {
  id: string // UUID
  first_name: string | null
  last_name: string | null
  google_permissions_set: boolean
  microsoft_permissions_set: boolean
  plan: PlanType
  direct_sheet_modification: boolean
  stripe_customer_id?: string
  subscription_id?: string
  subscription_status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  current_period_end?: string
  price_id?: string
  terms_acceptance: Record<string, unknown> // jsonb in Postgres
}

// user_usage table
export interface UserUsage {
  user_id: string // UUID
  requests_this_week: number
  requests_this_month: number
  images_processed_this_month: number
  visualizations_this_month: number
  requests_previous_3_months: number
  unsuccessful_requests_this_month: number
  recent_sheets: OnlineSheet[] | null // jsonb array of max length 6
  overage_hard_limit: number // in dollars
  overage_this_month: number // in dollars
}

// error_log table
export interface ErrorLog {
  id: string // UUID
  user_id: string // UUID
  original_query: string | null
  file_names?: string[]
  doc_names?: string[]
  message: string
  created_at: string // ISO timestamp
  error_code?: string | null
  request_type?: 'query' | 'visualization'
  error_message?: string
  processing_time_ms?: number | null
}

// request_log table
export interface RequestLog {
  id: string // UUID
  user_id: string // UUID
  query?: string
  file_names?: string[]
  doc_names?: string[]
  created_at: string // ISO timestamp
  processing_time_ms?: number | null
  status: string
  success: boolean
  error_message?: string
  request_type: 'query' | 'visualization'
  total_tokens?: number
  num_images_processed?: number
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

// file_permissions table
export interface FilePermissions {
  id: string // UUID
  user_id: string // UUID 
  file_id: string
  provider: 'google' | 'microsoft'
  expires_at: string // ISO timestamp
  created_at: string // ISO timestamp
}
