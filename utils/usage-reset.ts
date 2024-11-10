import { createClient } from '@/utils/supabase/client'

// This would run as a scheduled function
export async function resetMonthlyUsage() {
  const supabase = createClient()
  
  const { data: users, error } = await supabase
    .from('user_usage')
    .select('*')

  if (!error && users) {
    for (const user of users) {
      await supabase
        .from('user_usage')
        .update({
          requests_previous_3_months: user.requests_this_month,
          requests_this_month: 0,
          requests_this_week: 0
        })
        .eq('id', user.id)
    }
  }
} 