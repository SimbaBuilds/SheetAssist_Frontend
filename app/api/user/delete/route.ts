import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get the user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tableNames = [
      'user_profile',
      'user_usage',
      'error_log',
      'request_log',
      'file_permissions',
      'user_documents_access',
      'jobs'
    ]

    // Delete data from all tables using admin client
    for (const tableName of tableNames) {
      const { error } = await adminClient
        .from(tableName)
        .delete()
        .eq(tableName === 'user_profile' ? 'id' : 'user_id', user.id)

      if (error) {
        console.error(`Error deleting from ${tableName}:`, error)
        throw new Error(`Failed to delete data from ${tableName}`)
      }
    }

    // Delete the user using admin client
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    )

    if (deleteError) {
      throw deleteError
    }

    // Clear cookies
    cookies().getAll().forEach(cookie => {
      cookies().delete(cookie.name)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
} 