import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useDebounce } from '@/hooks/useDebounce'
import type { Organizations } from '@/lib/supabase/tables'

const namesSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organization: z.string().optional(),
  noOrganization: z.boolean().default(false)
}).refine(data => {
  if (!data.noOrganization && !data.organization) {
    return false
  }
  return true
}, {
  message: "Organization is required unless 'No Organization' is selected",
  path: ["organization"]
})

type NamesFormValues = z.infer<typeof namesSchema>

export function useNames() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [organizationSuggestions, setOrganizationSuggestions] = useState<Organizations[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const form = useForm<NamesFormValues>({
    resolver: zodResolver(namesSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      organization: '',
      noOrganization: false
    }
  })

  const searchOrganizations = useCallback(async (term: string) => {
    if (!term) {
      setOrganizationSuggestions([])
      return
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', `%${term}%`)
      .limit(5)

    if (!error && data) {
      setOrganizationSuggestions(data)
    }
  }, [supabase])

  // Effect to handle debounced search
  useEffect(() => {
    searchOrganizations(debouncedSearch)
  }, [debouncedSearch, searchOrganizations])

  const createOrganization = async (name: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const handleSubmit = async (data: NamesFormValues) => {
    setIsLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('No user found')

      let organizationId: string | null = null

      if (!data.noOrganization && data.organization) {
        // Check if organization exists
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', data.organization)
          .single()

        if (existingOrg) {
          organizationId = existingOrg.id
        } else {
          // Create new organization
          const newOrg = await createOrganization(data.organization)
          organizationId = newOrg.id
        }
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          id: user.id,
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          organization_id: organizationId
        })

      if (profileError) throw profileError

      router.push('/auth/setup-permissions')
    } catch (error) {
      console.error('Error updating profile:', error)
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'An error occurred while updating profile'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    form,
    handleSubmit,
    isLoading,
    organizationSuggestions,
    searchTerm,
    setSearchTerm
  }
}
