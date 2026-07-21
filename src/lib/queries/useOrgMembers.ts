import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { Profile } from '../../types/database.types'

export function useOrgMembers() {
  return useQuery({
    queryKey: ['org-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Profile[]
    },
  })
}
