import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { MOCK_AUTH } from '../auth/mockAuth'
import { getUsers } from '../auth/mockOrgStore'
import { useAuth } from '../auth/AuthContext'
import type { Profile } from '../../types/database.types'

export function useOrgMembers() {
  const { organization } = useAuth()

  return useQuery({
    queryKey: ['org-members', organization?.id],
    queryFn: async () => {
      if (MOCK_AUTH) {
        return getUsers().filter((u) => u.org_id === organization?.id)
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Profile[]
    },
  })
}
