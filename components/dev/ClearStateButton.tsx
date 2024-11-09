'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function ClearStateButton() {
  const clearAllState = async () => {
    const supabase = createClientComponentClient()
    
    // Clear Supabase auth
    await supabase.auth.signOut()
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Reload the page
    window.location.reload()
  }

  return process.env.NODE_ENV === 'development' ? (
    <button
      onClick={clearAllState}
      className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md text-sm"
    >
      Clear State
    </button>
  ) : null
} 