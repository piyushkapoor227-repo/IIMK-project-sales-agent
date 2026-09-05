// Organization branding updates (display name + logo). RLS: organizations_admin_update.
// Author: Piyush Kapoor.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'

export interface OrgPatch {
  name?: string
  logo_url?: string | null
}

export function useUpdateOrg() {
  const { organization, refreshProfile } = useAuth()
  return useMutation({
    mutationFn: async (patch: OrgPatch) => {
      if (!organization) throw new Error('No organization.')
      const { error } = await supabase.from('organizations').update(patch).eq('id', organization.id)
      if (error) throw error
    },
    onSuccess: () => refreshProfile(),
  })
}
