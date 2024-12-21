export type PlanType = 'free' | 'pro'

// Add plan limits constant
export const PLAN_REQUEST_LIMITS = {
  free: 10,
  pro: 200
} as const

export const PLAN_IMAGE_LIMITS = {
  free: 10,
  pro: 200
} as const

export const VIS_GEN_LIMITS = {
  free: 10,
  pro: 200
} as const